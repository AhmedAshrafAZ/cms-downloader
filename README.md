# cms-downloader

> **⚠️ This script is tested only on mac and linux. It's not tested on windows machines**

> **✅ Your login credentials are saved on your local machine. They don't leave it at all. They are only sent to CMS platform. You can make sure by reviewing the code**

## Motivation

Every developer has the coding superpower 😎. So, as a developer, you should automate all the boring stuff 😪 to free up some threads in your mind for the serious work. 👀🤓

## Script Description

This script is created to automate downloading the content from the GUC-CMS platform. It fetches the courses you are subscribed in, creates a folder for each course, downloads the content (ALL the content), each file in its corresponding week folder. Et voila! Everything is downloaded 🔥🔥

## Skip chromium installation (if you already have chromium installed)

> **⚠️ Make sure you have chromium installed using `which chromium`**

```bash
export CHROMIUM_EXECUTABLE_PATH=$(which chromium)
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

When `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` is set to `true`, puppeteer skips downloading the binaries for chromium, however you **must** provide an executable path to a chromium binary (which is done via the `CHROMIUM_EXECUTABLE_PATH` environment variable).

## Prepare your machine (if windows machine)

1. Download [Node.js](https://nodejs.org/en/) the LTS version then install it. The usual install just next next...

2. Download [Git Bash](https://git-scm.com/downloads) the windows version and also the usual install. Just tick the option of creating a desktop icon

3. You should be ready to move to the next step (How to run)

## How to run

1. Clone the repo

   ```
   git clone https://github.com/AhmedAshrafAZ/cms-downloader.git
   ```

2. Navigate to the script directory

   ```
   cd cms-downloader
   ```

3. Install node modules

   ```
   npm install && pip3 install -r requirements.txt
   ```

4. Add your username (without @student.guc.edu.eg) to the ".env" file

   ```
   echo "GUC_SK_USERNAME=your_username" > .env
   ```

5. Add your password to the ".env" file

   ```
   echo "GUC_SK_PASSWORD=your_password" >> .env
   ```

6. Run the script and let the magic begin 🎩🎩🔥🔥
   > if you want to convert downloaded videos to mp4 format, you can use the `--convert` flag. But make sure you have [ffmpeg](https://www.ffmpeg.org/) installed on your machine.
   ```
   node index.js && python3 vodDownloader.py --convert
   ```
   > if not, just run the script
   ```
   node index.js && python3 vodDownloader.py
   ```

## Unrevealing the magic behind the script 🤓

This script is mainly based on web scraping 🕷🕸 and DOM manipulation.

- Get the login credintials form the '.env' file and test authentication
- Fetch the home page to get all the courses that the student is subscribed in.
- Navigate to each course
- Select (using querySelector) all the anchor tags that contains download attribute
- Rename the value of the download attribute to the name its card
- Select all the unrated courses (this is my flag for the non-downloaded content)
- Download the unrated courses after checking that the week folder and course folder do exist
- Rate each content after downloading it.
- And repeat until everything is DONE 🔥🎩💪🏻

## Contribution 👀

You are very welcome to contribute to this repo. Just create the your Pull Request, I will review it & your updates will be merged ASAP insha'Allah. 💪🏻💪🏻
