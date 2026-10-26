package expo.modules.recipereader

import android.net.Uri
import androidx.core.os.bundleOf
import com.google.android.gms.tasks.Task
import com.google.mlkit.genai.common.DownloadStatus
import com.google.mlkit.genai.common.FeatureStatus
import com.google.mlkit.genai.prompt.Generation
import com.google.mlkit.genai.prompt.GenerativeModel
import com.google.mlkit.genai.prompt.TextPart
import com.google.mlkit.genai.prompt.generateContentRequest
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Reads recipes on the phone: ML Kit text recognition (OCR) for photos, and Gemini Nano
 * (ML Kit GenAI Prompt API, via AICore) to turn the text into the recipe JSON.
 * Nothing leaves the device.
 */
class RecipeReaderModule : Module() {
  private val recognizer by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }
  private val model: GenerativeModel by lazy { Generation.getClient() }

  override fun definition() = ModuleDefinition {
    Name("RecipeReader")
    Events("onDownloadProgress")

    /** Text blocks with their position, so JS can put multi-column pages in reading order. */
    AsyncFunction("recognizeBlocks") Coroutine { uri: String ->
      val context = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "No Android context", null)
      val image = InputImage.fromFilePath(context, Uri.parse(uri))
      val result = recognizer.process(image).await()
      result.textBlocks.mapNotNull { block ->
        val box = block.boundingBox ?: return@mapNotNull null
        mapOf(
          "text" to block.lines.joinToString("\n") { it.text },
          "left" to box.left,
          "top" to box.top,
          "right" to box.right,
          "bottom" to box.bottom,
        )
      }
    }

    /** "available" | "downloadable" | "downloading" | "unavailable" */
    AsyncFunction("modelStatus") Coroutine { ->
      when (model.checkStatus()) {
        FeatureStatus.AVAILABLE -> "available"
        FeatureStatus.DOWNLOADABLE -> "downloadable"
        FeatureStatus.DOWNLOADING -> "downloading"
        else -> "unavailable"
      }
    }

    /**
     * Downloads Gemini Nano through AICore. Every status AICore reports is sent as
     * onDownloadProgress { bytes, status } (status = the event's text, for diagnostics).
     */
    AsyncFunction("downloadModel") Coroutine { ->
      model.download().collect { status ->
        val bytes = if (status is DownloadStatus.DownloadProgress) status.totalBytesDownloaded.toDouble() else -1.0
        sendEvent("onDownloadProgress", bundleOf("bytes" to bytes, "status" to status.toString()))
        if (status is DownloadStatus.DownloadFailed) {
          throw CodedException("ERR_DOWNLOAD", status.e.message ?: "Model download failed", status.e)
        }
      }
      true
    }

    /** One text prompt to Gemini Nano; returns the first candidate's text. */
    AsyncFunction("generate") Coroutine { prompt: String, temperature: Double, maxOutputTokens: Int ->
      val response = model.generateContent(
        generateContentRequest(TextPart(prompt)) {
          this.temperature = temperature.toFloat()
          this.maxOutputTokens = maxOutputTokens
        },
      )
      response.candidates.firstOrNull()?.text ?: ""
    }
  }
}

/** Awaits a Google Play services Task inside a coroutine. */
private suspend fun <T> Task<T>.await(): T = suspendCancellableCoroutine { cont ->
  addOnSuccessListener { cont.resume(it) }
  addOnFailureListener { cont.resumeWithException(it) }
  addOnCanceledListener { cont.cancel() }
}
