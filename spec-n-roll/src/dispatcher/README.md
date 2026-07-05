# Dispatcher

The dispatcher is the executable routing layer for `spec-n-roll` and `snr`. It
keeps startup concerns in one place: parsing dispatcher-only flags, locating the
selected CLI entrypoint, and spawning the process that should handle the
invocation.

The implementation is intentionally small. `index.ts` is the executable
wrapper, `dispatcher.ts` owns the routing decision and delegated process
metadata, `location.ts` owns path and install-location resolution, and
`process.ts` owns executable validation and child process execution.
