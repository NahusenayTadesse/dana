# ⚙️ Environment Setup

This guide explains how to configure the **dana Electronics** project on your computer for local development.

Unlike many web applications, **dana Electronics does not require a local MySQL installation.** The application is designed to connect directly to the remote database hosted on the production server. This significantly simplifies the setup process and allows developers to begin working immediately.

> **Who is this guide for?**
>
> This guide is written for everyone, including users with little or no experience with Node.js, SvelteKit, or database administration.

---

# 📋 Prerequisites

Before running the project, ensure the following software is installed.

| Software | Required | Purpose |
|-----------|:-------:|---------|
| Node.js (Version 20 or newer) | ✅ | Runs the application |
| npm | ✅ | Installs project dependencies (included with Node.js) |
| Git | Recommended | Downloads the project from GitHub |
| Visual Studio Code | Recommended | Editing the source code |

> **Note**
>
> A local MySQL server is **not required**. The project connects directly to the hosted database.

---

# 📥 Step 1 – Install Node.js

Download the latest **Long-Term Support (LTS)** version of Node.js from the official website.

During installation, leave all options at their default values.

After installation is complete, open your terminal or command prompt and verify the installation.

```bash
node -v
```

You should see output similar to:

```text
v20.18.0
```

Next verify npm.

```bash
npm -v
```

You should see a version number.

If both commands return a version, Node.js has been installed successfully.

---

# 📂 Step 2 – Download the Project

Clone the project from GitHub.

```bash
git clone https://github.com/NahusenayTadesse/dana.git
```

Move into the project folder.

```bash
cd dana
```

---

# 📦 Step 3 – Install Dependencies

Install all required packages.

```bash
npm install
```

If npm reports dependency conflicts, run:

```bash
npm install --legacy-peer-deps
```

This only needs to be done once after downloading the project.

---

# 🔐 Step 4 – Create the Environment File

The application stores all private configuration inside a file named:

```
.env
```

This file contains:

- Database connection information
- Authentication secrets
- Payment gateway keys
- Email server credentials
- AI configuration
- Security settings

These values are intentionally kept outside of the source code.

---

## Create the File

Locate:

```
.env.example
```

Copy the file.

Rename the copy to:

```
.env
```

Your project root should now contain:

```
dana/
│
├── .env
├── .env.example
├── package.json
├── README.md
└── src/
```

---

# 🗄 Database Configuration

One of the advantages of the dana Electronics platform is that **you do not need to create or import a local database.**

Instead, the application connects directly to the remote MySQL server hosted in cPanel.

This allows you to begin development immediately without installing MySQL.

---

## Finding the Database Connection

Log into your cPanel account.

Open:

```
Setup Node.js App
```

Locate your application.

Inside the environment variables you will find:

```
DATABASE_URL
```

It will look similar to:

```text
mysql://username:password@localhost:3306/dana_database
```

Copy the **entire value**.

---

## Replace "localhost"

The copied connection string contains:

```
localhost
```

This works only when the application is running on the server.

Your own computer cannot access the production database using "localhost" because "localhost" always refers to the current machine.

Instead:

Replace

```
localhost
```

with the **server IP address**.

The server IP can be found on the **right side of the cPanel dashboard** immediately after logging in.

Example:

Original:

```text
mysql://dana_user:password@localhost:3306/dana_database
```

Updated:

```text
mysql://dana_user:password@154.xxx.xxx.xxx:3306/dana_database
```

Everything else should remain unchanged.

Paste this updated value into:

```env
DATABASE_URL=""
```

inside your `.env` file.

---

## 💡 Why is this necessary?

When the application runs on the production server, **localhost** refers to that server itself.

When the application runs on your own computer, **localhost** refers to your own computer instead.

Replacing localhost with the server IP tells the application where the real database is located.

---

# 🖼 Missing Product Images

After starting the application for the first time, you may notice that:

- Products appear correctly.
- Categories appear correctly.
- Prices appear correctly.
- Brands appear correctly.

However, product images may not appear.

**This is completely normal.**

The application stores uploaded files separately from the database.

While the database is shared remotely, uploaded images remain stored on the production server's filesystem.

Because these files are not included in the Git repository, your local computer has nothing to display.

This does **not** indicate a problem with the application.

---

## Restoring Images Locally

If you need to view uploaded images during development:

1. Copy the uploads directory from the production server.
2. Place it into the location specified by:

```env
FILES_DIR=
```

inside your `.env` file.

Restart the development server.

The images will appear automatically.

---

# 🚀 Step 5 – Start the Development Server

Start the application.

```bash
npm run dev -- --open
```

After a few seconds your browser should automatically open:

```
http://localhost:5173
```

If it does not open automatically, visit the address manually.

---

# ✅ Verifying Everything Works

If everything has been configured correctly, you should see:

- ✅ Homepage loads successfully
- ✅ Products are displayed
- ✅ Categories are visible
- ✅ Authentication pages load
- ✅ Database data is accessible

If product images are missing, this is expected unless the uploads directory has also been copied from the server.

---

# ❓ Frequently Asked Questions

## Do I need to install MySQL?

**No.**

The application connects directly to the hosted database.

---

## Why are product images missing?

Uploaded images are stored on the production server's filesystem and are not included in the repository.

---

## Can I accidentally modify the production database?

Yes.

Because the development environment connects directly to the live database, any changes made locally will affect the production data.

Exercise caution when creating, editing, or deleting records.

---

## I changed my `.env` file but nothing happened.

Environment variables are loaded only when the application starts.

Restart the development server after making changes.

---

## npm install failed.

Try:

```bash
npm install --legacy-peer-deps
```

If the issue persists, delete:

```
node_modules
package-lock.json
```

Then run:

```bash
npm install
```

again.

---

# 🎉 You're Ready

Congratulations!

Your local development environment is now configured and connected to the dana Electronics platform.

You can now begin developing new features, fixing bugs, or testing changes while using the shared production database.



# 🚀 Deploying Updates to the Production Website

This section explains how to deploy a new version of the **dana Electronics** website to the production server.

The deployment process is designed to safely replace the website's compiled application while preserving all existing configuration, uploaded files, and server settings.

> **Before You Begin**
>
> Before deploying, ensure that all changes have been tested locally and that the application builds successfully without any errors.

---

# Step 1 - Build the Application

Open a terminal in the root directory of the project and run:

```bash
npm run build
```

This command compiles the application into an optimized production build.

Wait until the build has completed successfully.

> ⚠️ **Important**
>
> If the build reports any errors, do **not** continue with deployment. Resolve all build errors first.

---

# Step 2 - Compress the Build Folder

After the build has completed successfully, locate the newly created **build** folder.

Compress **only** the build folder into one of the following formats:

```
build.tar
```

or

```
build.tar.gz
```

> ⚠️ **Important**
>
> Do **not** use ZIP compression.
>
> Some cPanel installations may incorrectly flag ZIP archives as suspicious or prevent them from being extracted correctly.
>
> Always compress the build folder using **TAR** or **TAR.GZ**.

---

# Step 3 - Upload the Build

Log in to **cPanel**.

Open **File Manager**.

Navigate to the following directory:

```
app/
```

Upload the newly created archive.

```
build.tar
```

or

```
build.tar.gz
```

If cPanel asks whether you want to replace the existing file, choose:

**Yes**

---

# Step 4 - Stop the Website

Return to the cPanel home page.

Open:

```
Setup Node.js App
```

Locate the existing dana Electronics application.

Click:

**Stop App**

Stopping the application prevents files from being used while the deployment is taking place.

---

# Step 5 - Remove the Previous Build

Return to **File Manager**.

Open the **app** directory.

Locate the folder named:

```
build
```

Delete **only** this folder.

> ⚠️ **Do Not Delete Anything Else**
>
> The following files and folders should remain untouched:
>
> - `.env`
> - `node_modules`
> - `package.json`
> - uploaded files
> - any configuration files
>
> Only the **build** folder should be removed.

---

# Step 6 - Extract the New Build

Locate the uploaded archive.

Right-click the file.

Choose:

**Extract**

Wait for extraction to finish.

A new **build** folder will be created automatically.

---

# Step 7 - Start the Website

If no new npm packages were installed during development, deployment is now complete.

Return to:

```
Setup Node.js App
```

Click:

**Restart App**

The website will now begin running the newly deployed version.

---

# Deploying New npm Packages

If new packages were installed during development (for example by running `npm install`), one additional step is required.

## Upload package.json

Upload your updated local:

```
package.json
```

to the **app** directory.

Replace the existing file.

---

## Install the New Packages

Open:

```
Setup Node.js App
```

Click:

**Edit**

Then click:

**Run NPM Install**

Wait for the installation process to finish successfully.

Once installation has completed, click:

**Start App**

The application will now start using the updated dependencies.

---

# Deployment Checklist

Before considering the deployment complete, verify the following:

- ✅ The application built successfully
- ✅ `build.tar` or `build.tar.gz` was uploaded
- ✅ The previous `build` folder was deleted
- ✅ The new build was extracted successfully
- ✅ The application was restarted
- ✅ The homepage loads correctly
- ✅ Products are visible
- ✅ The admin dashboard opens correctly
- ✅ The AI assistant responds correctly
- ✅ Checkout works as expected

If new npm packages were installed:

- ✅ `package.json` was uploaded
- ✅ **Run NPM Install** completed successfully

---

# Frequently Asked Questions

## Why do I need to stop the application first?

Stopping the application ensures that no files are being used while the new build is replacing the old one, preventing deployment issues.

---

## Why shouldn't I upload the entire project?

Only the compiled **build** folder changes during normal development.

Replacing only the build folder is faster, safer, and avoids accidentally overwriting important files such as the environment configuration or uploaded media.

---

## Why shouldn't I delete anything except the build folder?

The remaining files contain the application's configuration, installed packages, uploaded media, and environment settings.

Deleting them may prevent the website from starting or cause data loss.

---

## When should I run **Run NPM Install**?

Only when the project's dependencies have changed.

If you only modified the application code, simply replacing the build folder and restarting the application is all that is required.

---

# Deployment Complete

Your latest version of the dana Electronics website has now been deployed successfully.

The website should now be running the updated code while preserving all existing configuration, uploaded files, and production data.
# dana
