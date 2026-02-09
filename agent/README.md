# Thor SD-WAN CMS – Agent

Runs on remote machines (devices/servers). Reports to and receives configuration from the CMS API.

## Setup (per machine)

```bash
cd agent
./setup_vdev.sh
source vdev/bin/activate
```

Dependencies are in `agent/requirements.txt`. The API runs elsewhere; use `api/vdev` and `api/requirements.txt` on the API server.
