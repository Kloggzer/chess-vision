

def test_a_terminated_process_does_not_hold_the_training_lock():
    """A dead PID must be reclaimable, even while its process object still exists.

    Windows keeps the process OBJECT alive as long as any handle to it is open, so `OpenProcess`
    succeeds for a process that terminated minutes ago and whose parent has not let go. Checking
    only that the handle opens reported a finished run as live and refused every new training until
    the lock file was deleted by hand.
    """
    import os
    import subprocess
    import sys

    from chesslab.training.train import _pid_alive

    assert _pid_alive(os.getpid())
    assert not _pid_alive(999_999)

    # Hold the Popen object across the check: on Windows that keeps the handle, and therefore the
    # process object, alive after the child has exited. This is the exact situation that broke.
    p = subprocess.Popen([sys.executable, "-c", "pass"])
    p.wait()
    assert not _pid_alive(p.pid)
