# GitHub Setup Guide

## GitHub Authentication Issue

GitHub no longer accepts password authentication. You need to use a Personal Access Token (PAT).

## Option 1: Create Personal Access Token (Recommended)

### Step 1: Create a Personal Access Token

1. Go to GitHub: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: "Sunny2 Dashboard"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click "Generate token"
6. **IMPORTANT**: Copy the token immediately (you won't see it again!)

### Step 2: Use Token to Push

```bash
cd /home/greg/Development/Sunny2

# Remove existing remote if needed
git remote remove origin

# Add remote with token
git remote add origin https://YOUR_TOKEN@github.com/NohWayJose/Sunny2.git

# Push to GitHub
git branch -M main
git push -u origin main
```

Replace `YOUR_TOKEN` with the token you copied.

## Option 2: Use SSH (More Secure, Long-term)

### Step 1: Generate SSH Key (if you don't have one)

```bash
# Check if you already have an SSH key
ls -la ~/.ssh

# If no id_rsa.pub or id_ed25519.pub, generate one:
ssh-keygen -t ed25519 -C "noh.spam.jose@gmail.com"

# Press Enter to accept default location
# Enter a passphrase (optional but recommended)
```

### Step 2: Add SSH Key to GitHub

```bash
# Copy your public key
cat ~/.ssh/id_ed25519.pub
```

1. Go to GitHub: https://github.com/settings/keys
2. Click "New SSH key"
3. Title: "Sunny2 Development Machine"
4. Paste the key content
5. Click "Add SSH key"

### Step 3: Test SSH Connection

```bash
ssh -T git@github.com
# Should see: "Hi NohWayJose! You've successfully authenticated..."
```

### Step 4: Push with SSH

```bash
cd /home/greg/Development/Sunny2

# Remove HTTPS remote
git remote remove origin

# Add SSH remote
git remote add origin git@github.com:NohWayJose/Sunny2.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Option 3: Use GitHub CLI (Easiest)

### Install GitHub CLI

```bash
# Install gh CLI
sudo apt update
sudo apt install gh

# Authenticate
gh auth login

# Follow the prompts:
# - Choose GitHub.com
# - Choose HTTPS or SSH
# - Authenticate via web browser
```

### Push with GitHub CLI

```bash
cd /home/greg/Development/Sunny2

# Create repository and push
gh repo create Sunny2 --public --source=. --remote=origin --push
```

## Quick Reference

### After Authentication is Set Up

```bash
# Future updates:
cd /home/greg/Development/Sunny2
git add .
git commit -m "Your commit message"
git push
```

## Troubleshooting

### "Repository not found"
- Make sure you've created the repository on GitHub first
- Go to https://github.com/new
- Repository name: `Sunny2`
- Click "Create repository"

### "Authentication failed"
- For HTTPS: Use Personal Access Token, not password
- For SSH: Make sure your SSH key is added to GitHub
- For gh CLI: Run `gh auth login` again

### Check Current Remote

```bash
cd /home/greg/Development/Sunny2
git remote -v
```

## Recommended Approach

I recommend **Option 2 (SSH)** because:
- ✅ More secure
- ✅ No need to remember tokens
- ✅ Works long-term without expiration
- ✅ Standard practice for developers

## Next Steps After Pushing

Once your code is on GitHub:

1. ✅ Code is backed up
2. ✅ Version history is preserved
3. ✅ Can collaborate with others
4. ✅ Can deploy from GitHub
5. ✅ Can set up GitHub Actions for CI/CD

## Repository URL

After pushing, your repository will be at:
**https://github.com/NohWayJose/Sunny2**