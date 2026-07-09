package com.chesslab.tracker

import android.app.Application
import org.opencv.android.OpenCVLoader

class ChesslabApp : Application() {
    override fun onCreate() {
        super.onCreate()
        OpenCVLoader.initLocal()
    }
}
