# Ink infrastructure

This directory contains the process-facing Ink renderer adapter. The dispatcher launches it with inherited terminal streams, allowing Ink to use native raw keyboard input while the adapter waits for the mounted React session to end.
