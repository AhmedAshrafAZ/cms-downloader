'use strict';
const puppeteer = require('puppeteer');
const inquirer = require('inquirer');
const fs = require('fs');
const httpntlm = require('httpntlm');
require('dotenv').config();

const machine_type = process.platform;
const fileSeparator = () => {
  return machine_type === 'win32' ? '\\' : '/';
};

const pupp_options = {
  headless: true,
};

const userAuthData = {
  username: process.env.GUC_SK_USERNAME,
  password: process.env.GUC_SK_PASSWORD,
};

const authenticateUser = () => {
  return new Promise((resolve, reject) => {
    httpntlm.get(
      {
        ...userAuthData,
        url: 'https://cms.guc.edu.eg/apps/student/HomePageStn.aspx',
        rejectUnauthorized: false,
      },
      (err, res) => {
        console.log(res.statusCode === 200 ? '[+] You are authorized\n============' : '[!] You are not authorized. Please review your login credentials.');
        resolve(res.statusCode === 200);
      }
    );
  });
};

const navigateTo = async (page, target_link) => {
  await page.goto(target_link, {
    waitUntil: 'networkidle2',
    timeout: 500000,
  });
};

const getSeasons = async (page) => {
  return await page.evaluate(function () {
    const seasons = [];
    document.querySelectorAll('div[class="menu-header-title"]').forEach((el) => {
      const title = el.innerHTML.trim();
      seasons.push({
        name: title.substring(title.indexOf('Title') + 6).trim(),
        sid: parseInt(title.substring(title.indexOf(':') + 1, title.indexOf(',')).trim()),
        courses: [],
      });
    });
    seasons.forEach((_, index) => {
      const seasonCourses = document.querySelectorAll(`table[id="ContentPlaceHolderright_ContentPlaceHoldercontent_r1_GridView1_${index}"]`)[0].children[0].children;
      for (let i = 1; i < seasonCourses.length; i++) {
        const courseName = seasonCourses[i].children[1].innerText.trim().replaceAll('|', '');
        seasons[index].courses.push({
          name: courseName.substring(0, courseName.lastIndexOf('(')).trim().replace('(', '[').replace(')', ']'),
          id: parseInt(courseName.substring(courseName.lastIndexOf('(') + 1, courseName.lastIndexOf(')')).trim()),
        });
      }
    });
    return seasons;
  });
};

const resolveContentName = async (page) => {
  await page.evaluate(() => {
    document.querySelectorAll('a[download]').forEach((el) => {
      const fileName = el.parentElement.parentElement.parentElement.children[0].children[0].innerHTML;
      const fileExtension = el.href.split('.')[document.querySelectorAll('a[download]')[0].href.split('.').length - 1];
      const fullName = `${fileName}.${fileExtension}`;
      el.download = fullName;
    });
  });
};

const getContent = async (page, courses, seasonId) => {
  const content = [];
  const getWeeks = async (page) => {
    return await page.evaluate(() => {
      const weeks = [];

      document.querySelectorAll('div.weeksdata').forEach((el) => {
        const weekAnnouncement = el.children[1].children[0].innerText.trim();
        const weekDescription = el.children[1].children[1].innerText.trim();
        const tempWeekContent = el.children[1].children[2].children;
        const weekContent = [];

        for (let i = 1; i < tempWeekContent.length; i++) {
          const orgName = tempWeekContent[i].children[0].children[0].innerText.trim();
          const name = tempWeekContent[i].children[0].children[2].children[0].children[0].download.trim().replace('/', '').replace(':', '').toLowerCase();
          const id = parseInt(tempWeekContent[i].children[0].children[2].children[0].children[1].id);
          const url = orgName.includes('(VoD)')
            ? `https://dacasts3-vh.akamaihd.net/i/secure/150675/150675_,${id + 2}_${id}.mp4,${id}.mp4,.csmil/index_0_av.m3u8?null=0`
            : tempWeekContent[i].children[0].children[2].querySelector('a#download').href.trim();
          const watched = tempWeekContent[i].children[0].children[3].querySelector('i.fa-eye-slash').style.display == 'none';
          weekContent.push({
            name,
            url,
            watched,
          });
        }

        weeks.push({
          name: el.querySelector('h2.text-big').innerText,
          announcement: weekAnnouncement,
          description: weekDescription,
          content: weekContent,
        });
      });
      return weeks;
    });
  };

  const getCourseAnnouncements = async (page) => {
    return await page.evaluate(() => document.querySelector('div[id="ContentPlaceHolderright_ContentPlaceHoldercontent_desc"]').innerText.trim());
  };

  for (let i = 0; i < courses.length; i++) {
    await navigateTo(page, `https://cms.guc.edu.eg/apps/student/CourseViewStn.aspx?id=${courses[i].id}&sid=${seasonId}`);
    await resolveContentName(page);
    content.push({
      name: courses[i].name,
      weeks: await getWeeks(page),
      announcements: await getCourseAnnouncements(page),
    });
  }
  return content;
};

const getAnswers = async (questions, checkbox, message, params) => {
  const answers = await inquirer.prompt([
    {
      type: checkbox ? 'checkbox' : 'list',
      message: message,
      name: 'userAnswers',
      choices: questions,
      validate(answer) {
        if (answer.length < 1) {
          return 'You must choose at least one course.';
        }
        return true;
      },
      loop: false,
    },
  ]);
  return checkbox ? answers.userAnswers.map((a) => questions.findIndex((q) => q.name === a)) : questions.findIndex((q) => q.name === answers.userAnswers);
};

const downloadContent = async (page, season, courseName, weeks) => {
  const download = (url, file_path, file_name) => {
    if (!fs.existsSync(file_path)) fs.mkdirSync(file_path, { recursive: true });

    console.log(`[-] Downloading file (${file_name})...`);

    return new Promise((resolve, reject) => {
      if (url.includes('https://dacasts3-vh.akamaihd.net')) {
        console.log('VOD');
        resolve();
      } else {
        httpntlm.get(
          {
            ...userAuthData,
            url: url,
            rejectUnauthorized: false,
            binary: true,
          },
          (err, res) => {
            // Request failed
            if (err) {
              console.log('There is an error in the request, please report it. Error is: ', err.message);
              reject('Request Error');
            }

            // Request success, write to the file
            fs.writeFile(`${file_path}${fileSeparator()}${file_name}`, res.body, (err) => {
              if (err) {
                console.log('There is an error in file writing, please report it. Error is: ', err.message);
                reject('FileWriting Error');
              }
              console.log(`[+] Download completed. "${file_name}" is saved successfully in ${file_path}`);
              console.log('------------');
              resolve();
            });
          }
        );
      }
    });
  };

  const rootPath = `.${fileSeparator()}cms_downloads${fileSeparator()}${season}${fileSeparator()}${courseName}`;

  for (let i = 0; i < weeks.length; i++) {
    const weekName = weeks[i].name.replace(':', '').toLowerCase();
    const weekAnnouncement = weeks[i].announcement;
    const weekDescription = weeks[i].description;
    const weekContent = weeks[i].content;
    for (let j = 0; j < weekContent.length; j++) {
      const fileUrl = weekContent[j].url;
      const fileName = weekContent[j].name.replace(':', '').toLowerCase();
      await download(fileUrl, `${rootPath}${fileSeparator()}${weekName}`, fileName);
      // Rate the downloaded content
      // await rateContent(page, content[i].name);
    }
  }
};

(async () => {
  const browser = await puppeteer.launch(pupp_options);
  const page = await browser.newPage();

  // 00- Authenticate User
  console.log('[-] Authenticating...');
  let user_auth = await authenticateUser();
  if (!user_auth) {
    await browser.close();
    return;
  }

  await page.authenticate(userAuthData);
  await navigateTo(page, 'https://cms.guc.edu.eg/apps/student/ViewAllCourseStn');

  const seasons = await getSeasons(page);

  const selectedSeason = seasons[await getAnswers(seasons, false, 'Please select a season', ['sid'])];
  const selectedCourses = (await getAnswers(selectedSeason.courses, true, 'Please select the courses you want', ['id'])).map((c) => selectedSeason.courses[c]);
  const coursesContent = await getContent(page, selectedCourses, selectedSeason.sid);
  for (let i = 0; i < coursesContent.length; i++) {
    await downloadContent(page, selectedSeason.name, coursesContent[i].name, coursesContent[i].weeks);
  }

  // 6- End the session
  await browser.close();
})();
