package com.chesslab.tracker

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.chesslab.tracker.service.TrackerService
import com.chesslab.tracker.ui.ChesslabNavHost
import com.chesslab.tracker.ui.TrackerViewModel
import com.chesslab.tracker.ui.theme.ChesslabTrackerTheme

class MainActivity : ComponentActivity() {
    private val viewModel: TrackerViewModel by viewModels()

    private val connection =
        object : ServiceConnection {
            override fun onServiceConnected(
                name: ComponentName?,
                binder: IBinder?,
            ) {
                (binder as? TrackerService.LocalBinder)?.let { viewModel.onServiceConnected(it.service) }
            }

            override fun onServiceDisconnected(name: ComponentName?) {
                viewModel.onServiceDisconnected()
            }
        }

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            if (result[Manifest.permission.CAMERA] == true) startAndBindService()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestPermissions()
        setContent {
            ChesslabTrackerTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    ChesslabNavHost(viewModel = viewModel)
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        runCatching { unbindService(connection) }
    }

    private fun requestPermissions() {
        val permissions = mutableListOf(Manifest.permission.CAMERA)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions += Manifest.permission.POST_NOTIFICATIONS
        }
        permissionLauncher.launch(permissions.toTypedArray())
    }

    private fun startAndBindService() {
        val intent = Intent(this, TrackerService::class.java)
        startForegroundService(intent)
        bindService(intent, connection, Context.BIND_AUTO_CREATE)
    }
}
