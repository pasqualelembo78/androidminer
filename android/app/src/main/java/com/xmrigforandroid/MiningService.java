package com.xmrigforandroid;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Binder;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import com.xmrigforandroid.data.serialization.XMRigFork;
import com.xmrigforandroid.events.MinerStartEvent;
import com.xmrigforandroid.events.MinerStopEvent;
import com.xmrigforandroid.events.StdoutEvent;
import com.xmrigforandroid.utils.ProcessExitDetector;

import org.greenrobot.eventbus.EventBus;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MiningService extends Service {

    private static final String LOG_TAG = "MiningSvc";
    private static final String NOTIFICATION_CHANNEL_ID = "com.xmrigforandroid.service";
    private static final String NOTIFICATION_CHANNEL_NAME = "XMRig Service";
    private static final int NOTIFICATION_ID = 200;
    private Notification.Builder notificationbuilder;
    private Process process;
    private OutputReaderThread outputHandler;

    private final String ansiRegex = "\\e\\[[\\d;]*[^\\d;]";
    private final Pattern ansiRegexPattern = Pattern.compile(ansiRegex);

    @Override
    public void onCreate() {
        super.onCreate();

        Intent notificationIntent = new Intent(this, MiningService.class);
        PendingIntent pendingIntent =
                PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_MUTABLE);

        notificationbuilder =
                new Notification.Builder(this, NOTIFICATION_CHANNEL_ID)
                        .setContentTitle("XMRig for Android")
                        .setContentText("XMRig for Android Service")
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentIntent(pendingIntent)
                        .setTicker("XMRig for Android Service")
                        .setOngoing(true)
                        .setOnlyAlertOnce(true);

        NotificationManager notificationManager = (NotificationManager) getApplication()
                .getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                NOTIFICATION_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_DEFAULT);
        notificationManager.createNotificationChannel(channel);
        notificationManager.notify(NOTIFICATION_ID, notificationbuilder.build());
        this.startForeground(NOTIFICATION_ID, notificationbuilder.build());
    }

    public class MiningServiceBinder extends Binder {
        public MiningService getService() {
            return MiningService.this;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    private final IMiningService.Stub binder = new IMiningService.Stub() {
        @Override
        public void startMiner(String configPath, String xmrigFork) {
            startMining(configPath, xmrigFork);
        }

        @Override
        public void stopMiner() {
            stopMining();
        }
    };

    @Override
    public void onDestroy() {
        stopMining();
        super.onDestroy();
    }

    public void stopMining() {
        if (outputHandler != null) {
            outputHandler.interrupt();
            outputHandler = null;
        }
        if (process != null) {
            process.destroy();
            process = null;
            Log.i(LOG_TAG, "xmrig fermato");
        }
    }

    public void startMining(String configPath, String xmrigFork) {
        Log.i(LOG_TAG, "startMining() chiamato");
        Log.d(LOG_TAG, "configPath ricevuto: '" + configPath + "'");
        Log.d(LOG_TAG, "xmrigFork: " + xmrigFork);

        // Ferma eventuale processo precedente
        if (process != null) {
            process.destroy();
            process = null;
        }

        // FIX: Verifica che configPath non sia vuoto/null prima di procedere.
        // Se è vuoto, XMRigForAndroid.start() non è riuscito a scrivere la config.
        if (configPath == null || configPath.trim().isEmpty()) {
            Log.e(LOG_TAG, "ERRORE: configPath vuoto - la config non è stata scritta correttamente");
            EventBus.getDefault().post(new MinerStopEvent());
            return;
        }

        // Verifica che il file esista e abbia contenuto
        File configFile = new File(configPath);
        if (!configFile.exists()) {
            Log.e(LOG_TAG, "ERRORE: config.json non trovato in: " + configPath);
            EventBus.getDefault().post(new MinerStopEvent());
            return;
        }
        if (configFile.length() == 0) {
            Log.e(LOG_TAG, "ERRORE: config.json è vuoto in: " + configPath);
            EventBus.getDefault().post(new MinerStopEvent());
            return;
        }

        Log.d(LOG_TAG, "config.json OK: " + configPath + " (" + configFile.length() + " bytes)");

        // Seleziona il binario xmrig in base al fork
        String xmrigBin = XMRigFork.MONEROOCEAN.toString().equals(xmrigFork)
                ? "libxmrig-mo.so"
                : "libxmrig.so";
        String xmrigPath = getApplicationInfo().nativeLibraryDir + "/" + xmrigBin;
        Log.d(LOG_TAG, "xmrig path: " + xmrigPath);

        // Verifica che il binario esista
        File xmrigFile = new File(xmrigPath);
        if (!xmrigFile.exists()) {
            Log.e(LOG_TAG, "ERRORE: binario xmrig non trovato in: " + xmrigPath);
            EventBus.getDefault().post(new MinerStopEvent());
            return;
        }

        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        PowerManager.WakeLock wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK, "XMRigForAndroid::MinerWakeLock");
        wakeLock.acquire(10 * 60 * 1000L); // max 10 minuti per sicurezza

        try {
            String[] args = {
                xmrigPath,
                "--config=" + configPath,   // FIX: usa --config= invece di -c separato
                "--http-host=127.0.0.1",
                "--http-port=50080",
                "--http-access-token=XMRigForAndroid",
                "--http-no-restricted"
            };

            Log.d(LOG_TAG, "Avvio xmrig con args: " + java.util.Arrays.toString(args));

            ProcessBuilder pb = new ProcessBuilder(args);
            pb.redirectErrorStream(true);
            // Imposta la working directory al filesDir per coerenza
            pb.directory(getFilesDir());

            process = pb.start();

            ProcessExitDetector processExitDetector = new ProcessExitDetector(process);
            processExitDetector.addProcessListener(p -> {
                Log.i(LOG_TAG, "xmrig terminato");
                EventBus.getDefault().post(new MinerStopEvent());
            });
            processExitDetector.start();

            outputHandler = new OutputReaderThread(process.getInputStream());
            outputHandler.start();

            EventBus.getDefault().post(new MinerStartEvent());
            Log.i(LOG_TAG, "xmrig avviato con successo");

        } catch (Exception e) {
            Log.e(LOG_TAG, "Eccezione avvio xmrig: ", e);
            process = null;
            wakeLock.release();
            EventBus.getDefault().post(new MinerStopEvent());
        }
    }

    public void updateNotification(String str) {
        Matcher matcher = ansiRegexPattern.matcher(str);
        notificationbuilder.setContentText(matcher.replaceAll(""));
        NotificationManager notificationManager = (NotificationManager) getApplication()
                .getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.notify(NOTIFICATION_ID, notificationbuilder.build());
    }

    private class OutputReaderThread extends Thread {
        private final InputStream inputStream;

        OutputReaderThread(InputStream inputStream) {
            this.inputStream = inputStream;
        }

        public void run() {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    updateNotification(line);
                    EventBus.getDefault().post(new StdoutEvent(line));
                    Log.d(LOG_TAG, line);
                    if (currentThread().isInterrupted()) return;
                }
            } catch (IOException e) {
                Log.w(LOG_TAG, "OutputReaderThread exception", e);
                EventBus.getDefault().post(new MinerStopEvent());
            }
        }
    }
}
