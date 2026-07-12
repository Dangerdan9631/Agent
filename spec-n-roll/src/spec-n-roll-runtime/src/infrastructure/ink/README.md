# Ink infrastructure

This directory contains the process-facing Ink renderer adapter. The dispatcher launches it with inherited terminal streams, passes the configured runtime session into Ink, waits for the mounted React session to end, then clears the interactive terminal screen.
