package com.xmrigforandroid.utils

import android.content.Context
import android.util.Base64
import android.util.Log
import com.xmrigforandroid.data.serialization.Configuration
import org.json.JSONException
import org.json.JSONObject
import java.io.*
import java.io.File
import java.nio.charset.Charset


class XMRigConfigBuilder(val context: Context) {

    // config parte vuota - viene popolata da setConfiguration()
    var config: String = ""

    fun reset() {
        config = ""
    }

    fun getConfigPath(): String = "${context.filesDir.absolutePath}/config.json"

    fun readConfigFromDisk(): String {
        return try {
            File(getConfigPath()).readText()
        } catch (e: IOException) {
            Log.e(TAG, "Errore lettura config da disco: ${e.message}")
            ""
        }
    }

    /**
     * Riceve il JSON completo codificato in base64 da React Native e lo imposta
     * come configurazione corrente per xmrig.
     */
    fun setConfiguration(data: Configuration) {
        if (data.config.isNullOrBlank()) {
            Log.w(TAG, "❌ MINER CONFIG: data.config è null o vuoto — la configurazione non è stata costruita correttamente lato JS")
            return
        }
        try {
            val decoded = String(Base64.decode(data.config, Base64.DEFAULT), Charset.defaultCharset())

            // Valida JSON
            val json = JSONObject(decoded)

            // LOG DIAGNOSTICO - mostra i campi chiave della config ricevuta
            val poolsArr = json.optJSONArray("pools")
            val pool = poolsArr?.optJSONObject(0)
            val url    = pool?.optString("url", "")    ?: ""
            val user   = pool?.optString("user", "")   ?: ""
            val algo   = pool?.optString("algo", "")   ?: ""
            val donate = json.optInt("donate-level", -1)
            val cpu    = json.optJSONObject("cpu")
            val threads = cpu?.optInt("max-threads-hint", -1) ?: -1

            Log.i(TAG, "✅ MINER CONFIG ricevuta:")
            Log.i(TAG, "   pool.url    = '$url'")
            Log.i(TAG, "   pool.user   = '${user.take(30)}...'")
            Log.i(TAG, "   pool.algo   = '$algo'")
            Log.i(TAG, "   donate-level= $donate")
            Log.i(TAG, "   threads-hint= $threads")

            // Warning su valori problematici
            if (url.isBlank())   Log.w(TAG, "⚠️  pool.url è vuoto — il miner non sa dove connettersi!")
            if (user.isBlank())  Log.w(TAG, "⚠️  pool.user è vuoto — nessun wallet configurato!")
            if (algo.isBlank())  Log.w(TAG, "⚠️  pool.algo è vuoto — xmrig userà rilevamento automatico")
            if (donate != 0)     Log.w(TAG, "⚠️  donate-level=$donate (atteso 0)")
            if (!url.contains("mevacoin", ignoreCase = true) && url.isNotBlank())
                Log.w(TAG, "⚠️  Il pool non sembra pool.mevacoin.com: '$url'")

            config = decoded
            Log.i(TAG, "✅ Config scritta in memoria: ${decoded.length} bytes")

        } catch (e: JSONException) {
            Log.e(TAG, "❌ MINER CONFIG: JSON non valido dal lato JS: ${e.message}")
            Log.e(TAG, "   Contenuto raw (prime 300 chars): ${
                try { String(Base64.decode(data.config, Base64.DEFAULT), Charset.defaultCharset()).take(300) }
                catch (ex: Exception) { "impossibile decodificare: ${ex.message}" }
            }")
        } catch (e: IllegalArgumentException) {
            Log.e(TAG, "❌ MINER CONFIG: Errore decodifica base64: ${e.message}")
        }
    }

    fun getConfigString(): String = config

    /**
     * Scrive la config su disco.
     * NON lancia eccezioni: in caso di errore logga e ritorna stringa vuota.
     * La stringa vuota viene controllata da XMRigForAndroid.start() che
     * mostra un messaggio chiaro nel log del miner.
     */
    fun writeConfig(): String {
        if (config.isBlank()) {
            Log.e(TAG, "❌ MINER CONFIG: writeConfig() chiamato ma config è vuota.")
            Log.e(TAG, "   Possibili cause:")
            Log.e(TAG, "   1. Modalità Semplice: wallet address non inserito o non valido")
            Log.e(TAG, "   2. Modalità Avanzata: JSON non valido nel campo di testo")
            Log.e(TAG, "   3. setConfiguration() ha ricevuto data.config null/vuoto")
            return ""
        }

        val dir = context.filesDir
        if (!dir.exists()) dir.mkdirs()

        return try {
            val f = File(dir, "config.json")
            f.writeText(config)
            Log.i(TAG, "✅ config.json scritto su: ${f.absolutePath} (${f.length()} bytes)")
            f.absolutePath
        } catch (e: IOException) {
            Log.e(TAG, "❌ Errore scrittura config.json: ${e.message}")
            ""
        }
    }

    companion object {
        private const val TAG = "MinerConfig"
    }
}
