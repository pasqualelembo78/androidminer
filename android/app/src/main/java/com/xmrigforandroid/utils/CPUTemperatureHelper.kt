package com.xmrigforandroid.utils

import android.util.Log
import java.io.File
import java.io.RandomAccessFile

class CPUTemperatureHelper {
    companion object {
        private const val TAG = "CPUTemperatureHelper"

        // Priorità dei tipi di zona termica (in ordine di preferenza)
        private val CPU_ZONE_KEYWORDS = listOf(
            "cpu", "tsens_tz_sensor", "soc_thermal", "soc", "skin", "ap_therm", "back_therm"
        )

        // Path alternativo via battery service (disponibile su quasi tutti i dispositivi)
        private const val BATTERY_TEMP_PATH = "/sys/class/power_supply/battery/temp"

        var tempPath: String = ""

        fun searchCpuTemperature(): Float {
            val thermalDir = File("/sys/devices/virtual/thermal/")
            val dirs = thermalDir.listFiles()

            if (dirs != null) {
                // Prima passata: cerca una zona con keyword ad alta priorità
                for (keyword in CPU_ZONE_KEYWORDS) {
                    for (dir in dirs) {
                        try {
                            val typeFile = dir.resolve("type")
                            val tempFile = dir.resolve("temp")
                            if (!typeFile.exists() || !tempFile.exists()) continue

                            val typeVal = RandomAccessFile(typeFile, "r").readLine()?.lowercase() ?: continue
                            if (typeVal.contains(keyword)) {
                                val raw = RandomAccessFile(tempFile, "r").readLine()?.toFloatOrNull() ?: continue
                                val temp = if (raw > 1000) raw / 1000.0f else raw
                                if (temp in 1.0f..120.0f) { // sanity check
                                    tempPath = tempFile.absolutePath
                                    Log.d(TAG, "Found thermal zone: $typeVal at $tempPath -> $temp°C")
                                    return temp
                                }
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Error reading ${dir.name}: ${e.message}")
                        }
                    }
                }

                // Seconda passata: prendi la prima zona con un valore valido
                for (dir in dirs) {
                    try {
                        val tempFile = dir.resolve("temp")
                        if (!tempFile.exists()) continue
                        val raw = RandomAccessFile(tempFile, "r").readLine()?.toFloatOrNull() ?: continue
                        val temp = if (raw > 1000) raw / 1000.0f else raw
                        if (temp in 1.0f..120.0f) {
                            tempPath = tempFile.absolutePath
                            Log.d(TAG, "Fallback thermal zone at $tempPath -> $temp°C")
                            return temp
                        }
                    } catch (e: Exception) { /* ignora */ }
                }
            }

            // Ultimo fallback: temperatura batteria (in decimi di grado su Android)
            try {
                val batteryFile = File(BATTERY_TEMP_PATH)
                if (batteryFile.exists()) {
                    val raw = batteryFile.readText().trim().toFloatOrNull()
                    if (raw != null) {
                        val temp = raw / 10.0f // Android riporta in decimi
                        if (temp in 1.0f..80.0f) {
                            tempPath = BATTERY_TEMP_PATH
                            Log.d(TAG, "Using battery temp: $temp°C")
                            return temp
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Battery temp not available: ${e.message}")
            }

            // Non trovato: segna come da ricercare al prossimo ciclo (non bloccare su "not_found")
            tempPath = ""
            Log.w(TAG, "No valid thermal zone found")
            return 0.0f
        }

        fun getCpuTemperature(): Float {
            if (tempPath.isEmpty()) {
                return searchCpuTemperature()
            }
            try {
                val file = File(tempPath)
                if (!file.exists()) {
                    tempPath = "" // path non più valido, risearch al prossimo ciclo
                    return searchCpuTemperature()
                }
                val raw = RandomAccessFile(tempPath, "r").readLine()?.toFloatOrNull() ?: return 0.0f
                val temp = if (raw > 1000) raw / 1000.0f else raw
                return if (temp in 1.0f..120.0f) temp else 0.0f
            } catch (e: Exception) {
                Log.e(TAG, "Error reading temp: ${e.message}")
                tempPath = "" // forza nuova ricerca
            }
            return 0.0f
        }
    }
}
