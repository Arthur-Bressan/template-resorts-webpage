#!/bin/bash
cd /home/z/my-project
while true; do
  npx next dev -p 3000 > /tmp/dev-server.out 2>&1 < /dev/null
  echo "Server crashed, restarting in 3s..." >> /tmp/dev-server.out
  sleep 3
done
