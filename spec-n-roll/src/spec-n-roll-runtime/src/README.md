# Runtime source

This source directory contains the runtime entry point that receives dispatcher invocation data over stdin. Runtime code should parse the API package payload shape before performing command behavior so dispatcher metadata, argv, project root, and cwd stay explicit.
