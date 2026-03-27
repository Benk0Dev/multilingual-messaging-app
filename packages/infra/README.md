# Infra

## Deploying

Before deploying changes, set your public IP so security groups or similar config can allow access from your machine (provided that your IP has access to the deployment target):

```bash
export MY_IP=$(curl -s ifconfig.me)
```

Run that in the same terminal session you use for the deploy. Then continue with your usual deploy commands.
