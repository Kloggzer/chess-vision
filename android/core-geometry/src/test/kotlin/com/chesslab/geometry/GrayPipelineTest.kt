package com.chesslab.geometry

import com.chesslab.geometry.testutil.SyntheticBoard
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class GrayPipelineTest {
    private fun bytes(mat: Mat): ByteArray {
        val out = ByteArray(mat.rows() * mat.cols())
        mat.get(0, 0, out)
        return out
    }

    @Test
    fun `the cached CLAHE handle produces identical output on repeated calls`() {
        val pipeline = GrayPipeline(claheClip = 2.0)
        val frame = SyntheticBoard.frame()
        val first = bytes(pipeline.toGray(frame))
        val second = bytes(pipeline.toGray(frame))
        assertEquals(first.toList(), second.toList())
    }

    @Test
    fun `clahe clip zero skips CLAHE but still blurs`() {
        val frame = SyntheticBoard.frame()
        val plain = GrayPipeline(claheClip = 0.0).toGray(frame)
        val enhanced = GrayPipeline(claheClip = 2.0).toGray(frame)
        assertNotEquals(bytes(plain).toList(), bytes(enhanced).toList(), "CLAHE must change the plane")

        val reference = Mat()
        Imgproc.cvtColor(frame, reference, Imgproc.COLOR_BGR2GRAY)
        Imgproc.GaussianBlur(reference, reference, Size(5.0, 5.0), 0.0)
        assertEquals(bytes(reference).toList(), bytes(plain).toList(), "claheClip = 0 is cvtColor + blur")
    }

    @Test
    fun `the blur really runs - a hard edge is softened`() {
        val hard = Mat(64, 64, CvType.CV_8UC3, org.opencv.core.Scalar(0.0, 0.0, 0.0))
        Imgproc.rectangle(
            hard,
            org.opencv.core.Point(32.0, 0.0),
            org.opencv.core.Point(63.0, 63.0),
            org.opencv.core.Scalar(255.0, 255.0, 255.0),
            Imgproc.FILLED,
        )
        val out = GrayPipeline(claheClip = 0.0).toGray(hard)
        val v = out.get(32, 31)[0]
        assertEquals(true, v > 0.0 && v < 255.0, "the edge pixel must be an intermediate value, got $v")
    }

    @Test
    fun `the output Mat can be reused across frames`() {
        val pipeline = GrayPipeline(claheClip = 2.0)
        val dst = Mat()
        assertSame(dst, pipeline.toGray(SyntheticBoard.frame(), dst))
        assertEquals(CvType.CV_8UC1, dst.type())
        assertEquals(SyntheticBoard.FRAME_SIDE, dst.width())
        assertSame(dst, pipeline.toGray(SyntheticBoard.frame(), dst))
        assertEquals(0.0, Core.norm(dst, pipeline.toGray(SyntheticBoard.frame()), Core.NORM_INF), 0.0)
    }
}
