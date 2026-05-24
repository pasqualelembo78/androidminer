package com.xmrigforandroid

import android.content.*
import android.os.FileObserver
import android.os.IBinder
import android.os.RemoteException
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.xmrigforandroid.data.serialization.Configuration
import com.xmrigforandroid.utils.XMRigConfigBuilder
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import org.greenrobot.eventbus.EventBus
import org.greenrobot.eventbus.Subscribe
import org.greenrobot.eventbus.ThreadMode
import java.lang.Exception
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.util.*
import android.os.BatteryManager

import android.content.Context.BATTERY_SERVICE
import com.xmrigforandroid.events.*
import com.xmrigforandroid.services.IXMRigAPIService
import com.xmrigforandroid.services.ThermalService
import com.xmrigforandroid.services.XMRigAPIService
import com.xmrigforandroid.utils.CPUTemperatureHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.newSingleThreadContext
import kotlinx.coroutines.runBlocking


class XMRigForAndroid(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

    var miningService: IMiningService? = null
    var xmrigAPIService: IXMRigAPIService? = null
    val configBuilder = XMRigConfigBuilder(this.reactApplicationContext.applicationContext)
    var isMining = false

    private val serverConnection = object : ServiceConnection {
        override fun onServiceConnected(className: ComponentName?, service: IBinder?) {
            if (className != null) {
                Log.d("className", className.className)
            }
            when (className?.className) {
                "com.xmrigforandroid.MiningService" -> {
                    miningService = IMiningService.Stub.asInterface(service)
                }
                "com.xmrigforandroid.services.XMRigAPIService" -> {
                    xmrigAPIService = IXMRigAPIService.Stub.asInterface(service)
                }
            }
        }

        override fun onServiceDisconnected(className: ComponentName?) {
            when (className?.className) {
                "com.xmrigforandroid.MiningService" -> {
                    miningService = null
                }
                "com.xmrigforandroid.services.XMRigAPIService" -> {
                    xmrigAPIService = null
                }
            }
        }
    }

    init {
        runBlocking(Dispatchers.IO) {
            arrayOf(
                MiningService::class.java,
                XMRigAPIService::class.java,
                ThermalService::class.java
            ).onEach {
                launch(newSingleThreadContext("Thread-" + it.toString())) {
                    val intent = Intent(context, it)
                    context.bindService(intent, serverConnection, Context.BIND_AUTO_CREATE)
                    when (it) {
                        MiningService::class.java -> {
                            context.startForegroundService(intent)
                        }
                        else -> {
                            context.startService(intent)
                        }
                    }
                }
            }
        }
    }

    private val fileObserver: FileObserver = object : FileObserver(File(configBuilder.getConfigPath()), MODIFY) {
        override fun onEvent(event: Int, path: String?) {
            Log.d("FileObserver", "fileObserver: $event $path | isMining: $isMining")
            if (!isMining) return
            val payload = Arguments.createMap()
            payload.putString("config", configBuilder.readConfigFromDisk())
            reactApplicationContext
                .getJSModule(RCTDeviceEventEmitter::class.java)
                .emit("onConfigUpdate", payload)
        }
    }

    @Subscribe(threadMode = ThreadMode.ASYNC)
    fun onMessageEvent(event: StdoutEvent) {
        val payload = Arguments.createMap()
        val strArr = arrayOf(event.value)
        payload.putArray("log", Arguments.fromArray(strArr))
        reactApplicationContext
            .getJSModule(RCTDeviceEventEmitter::class.java)
            .emit("onLog", payload)
    }

    @Subscribe(threadMode = ThreadMode.ASYNC)
    fun onMinerStartEvent(event: MinerStartEvent) {
        this.isMining = true
        xmrigAPIService?.startSummaryUpdates()
        val payload = Arguments.createMap()
        payload.putBoolean("isWorking", true)
        reactApplicationContext
            .getJSModule(RCTDeviceEventEmitter::class.java)
            .emit("onStatusChange", payload)
    }

    @Subscribe(threadMode = ThreadMode.ASYNC)
    fun onMinerStopEvent(event: MinerStopEvent) {
        this.isMining = false
        xmrigAPIService?.stopSummaryUpdates()
        val payload = Arguments.createMap()
        payload.putBoolean("isWorking", false)
        reactApplicationContext
            .getJSModule(RCTDeviceEventEmitter::class.java)
            .emit("onStatusChange", payload)
    }

    @Subscribe(threadMode = ThreadMode.ASYNC)
    fun onPowerEvent(event: PowerEvent) {
        val payload = Arguments.createMap()
        payload.putString("action", event.action.toString())
        if (event.value != null) {
            payload.putDouble("value", event.value!!.toDouble())
        }
        reactApplicationContext
            .getJSModule(RCTDeviceEventEmitter::class.java)
            .emit("onPower", payload)
    }

    @Subscribe(threadMode = ThreadMode.ASYNC)
    fun onMinerSummaryEvent(event: MinerSummaryEvent) {
        if (event.value != null) {
            val payload = Arguments.createMap()
            payload.putString("data", event.value)
            reactApplicationContext
                .getJSModule(RCTDeviceEventEmitter::class.java)
                .emit("onSummary", payload)
        }
    }

    @Subscribe(threadMode = ThreadMode.ASYNC)
    fun onThermalEvent(event: ThermalEvent) {
        val payload = Arguments.createMap()
        payload.putDouble("cpuTemperature", event.cpuTemperature.toDouble())
        reactApplicationContext
            .getJSModule(RCTDeviceEventEmitter::class.java)
            .emit("onThermal", payload)
    }

    @ReactMethod
    fun start(configurationJSON: String) {
        try {
            fileObserver.startWatching()
            val jsonFormat = Json { explicitNulls = false }
            val data = jsonFormat.decodeFromString<Configuration>(configurationJSON)

            Log.d(name, "Start XMRig (${data.xmrig_fork.toString().lowercase(Locale.getDefault())})")
            Log.d(name, "configurationJSON ricevuto: ${configurationJSON.take(300)}")

            configBuilder.reset()
            configBuilder.setConfiguration(data)

            val configPath = configBuilder.writeConfig()

            // FIX: Verifica che writeConfig() abbia prodotto un percorso valido.
            // Se è vuoto, la config non è stata scritta (JSON non valido o config vuota).
            // In questo caso non avviare xmrig per evitare di lanciare un processo
            // senza config che poi cade nei percorsi di fallback.
            if (configPath.isBlank()) {
                Log.e(name, "ERRORE: writeConfig ha restituito percorso vuoto. " +
                        "Verifica che la configurazione del pool sia completa " +
                        "(wallet address, hostname, porta).")
                // Notifica il lato JS che qualcosa è andato storto
                val payload = Arguments.createMap()
                payload.putBoolean("isWorking", false)
                reactApplicationContext
                    .getJSModule(RCTDeviceEventEmitter::class.java)
                    .emit("onStatusChange", payload)
                return
            }

            Log.d(name, "Config scritta su: $configPath")
            Log.d(name, "Config content: ${configBuilder.getConfigString().take(400)}")

            miningService?.startMiner(configPath, data.xmrig_fork.toString())

        } catch (e: RemoteException) {
            Log.e(name, "RemoteException in start(): ${e.message}")
        } catch (e: Exception) {
            // FIX: Cattura qualsiasi eccezione per evitare crash silenziosi
            // che lasciano xmrig precedente in esecuzione senza nuova config.
            Log.e(name, "Eccezione in start(): ${e.javaClass.simpleName}: ${e.message}")
        }
    }

    @ReactMethod
    fun stop() {
        Log.d(name, "Stop chiamato da RN")
        try {
            miningService?.stopMiner()
            xmrigAPIService?.stopSummaryUpdates()
        } catch (e: RemoteException) {
            Log.e(name, "RemoteException in stop(): ${e.message}")
        }
        EventBus.getDefault().post(MinerStopEvent())
    }

    @ReactMethod
    fun availableProcessors(promise: Promise) {
        try {
            val availableProcessors = Integer.valueOf(Runtime.getRuntime().availableProcessors())
            promise.resolve(availableProcessors)
        } catch (e: Exception) {
            promise.reject("availableProcessors", e)
        }
    }

    @ReactMethod
    fun pauseMiner() {
        xmrigAPIService?.pauseMiner()
    }

    @ReactMethod
    fun resumeMiner() {
        xmrigAPIService?.resumeMiner()
    }

    override fun getName(): String = "XMRigForAndroid"

    override fun initialize() {
        super.initialize()
        EventBus.getDefault().register(this)
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        EventBus.getDefault().unregister(this)
    }

    @ReactMethod
    fun addListener(eventName: String?) {
        when (eventName) {
            "onPower" -> {
                val bm = reactApplicationContext.getSystemService(BATTERY_SERVICE) as BatteryManager
                val batteryLevel = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

                val batteryStatus: Intent? = IntentFilter(Intent.ACTION_BATTERY_CHANGED).let { ifilter ->
                    reactApplicationContext.applicationContext.registerReceiver(null, ifilter)
                }

                val chargePlug: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1) ?: -1

                EventBus.getDefault().post(PowerEvent(PowerEventAction.BATTERY_CHANGED, batteryLevel))
                if (chargePlug > 0) {
                    EventBus.getDefault().post(PowerEvent(PowerEventAction.POWER_CONNECTED))
                } else {
                    EventBus.getDefault().post(PowerEvent(PowerEventAction.POWER_DISCONNECTED))
                }
            }
        }
    }

    @ReactMethod
    fun removeListeners(count: Int?) {
        // Keep: Required for RN built in Event Emitter Calls.
    }
}
