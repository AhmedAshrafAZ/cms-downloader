# cms-downloader

> **⚠️ This script is tested only on mac and linux. It's not tested on windows machines**

> **✅ Your login credentials are saved on your local machine. They don't leave it at all. They are only sent to CMS platform. You can make sure by reviewing the code**

## Motivation

Every developer has the coding superpower 😎. So, as a developer, you should automate all the boring stuff 😪 to free up some threads in your mind for the serious work. 👀🤓

## Script Description

This script is created to automate downloading the content from the GUC-CMS platform. It fetches the courses you are subscribed in, creates a folder for each course, downloads the content (ALL the content), each file in its corresponding week folder. Et voila! Everything is downloaded 🔥🔥

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
   npm install
   ```

4. Add your username (without @student.guc.edu.eg) to the ".env" file

   ```
   echo "USERNAME=your_username" > .env
   ```

5. Add your password to the ".env" file

   ```
   echo "PASSWORD=your_password" >> .env
   ```

6. Run the script and let the magic begin 🎩🎩🔥🔥
   ```
   node index.js
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
