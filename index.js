'use strict';
const puppeteer = require('puppeteer');
const fs = require('fs');
const httpntlm = require('httpntlm');
const { callbackify } = require('util');
const { resolve } = require('path');

require('dotenv').config();

const pupp_options = {
  headless: true,
};

const userAuthData = {
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
};

const navigateTo = async (page, target_link) => {
  await page.goto(target_link, {
    waitUntil: 'networkidle0',
    timeout: 500000,
  });
};

const getAvailableCourses = async (page) => {
  console.log('[-] Fetching Course');
  return await page.evaluate(() => {
    const courses_menu = document.querySelectorAll(
      'ul[class="vertical-nav-menu metismenu"]'
    )[0].childNodes[5].childNodes[3].childNodes;
    let courses_links = [];
    for (var i = 1; i < courses_menu.length; i += 2) {
      if (!courses_menu[i].children[0].href.includes('ViewAllCourseStn'))
        courses_links.push(courses_menu[i].children[0].href.trim());
    }
    console.log('[+] Fetching Courses Done');
    console.log('============');
    return courses_links;
  });
};

const getCourseName = async (page) => {
  return await page.evaluate(() => {
    let name = document
      .querySelectorAll(
        'span[id="ContentPlaceHolderright_ContentPlaceHoldercontent_LabelCourseName"]'
      )[0]
      .innerHTML.toString()
      .trim();
    name = name.substring(0, name.lastIndexOf('(')).trim(); // Remove courseID
    name = name.replaceAll('|', '').replaceAll('(', '[').replaceAll(')', ']'); // Remove the '|' then replace () with []
    return name.trim();
  });
};

const getUnratedContent = async (page) => {
  return await page.evaluate(() => {
    const content = [];
    document
      .querySelectorAll(
        'input[class="btn btn-danger close1"][style="display: none;"]' // The unrated content flag
      )
      .forEach((el) => {
        content.push({
          week: el.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].innerHTML.trim(),
          name: el.parentElement.parentElement.children[0].children[0].download,
          link: el.parentElement.parentElement.children[0].children[0].href,
        });
      });
    return content;
  });
};

const resolveContentName = async (page) => {
  await page.evaluate(() => {
    document.querySelectorAll('a[download]').forEach((el) => {
      let fileName =
        el.parentElement.parentElement.parentElement.children[0].children[0]
          .innerHTML;
      let fileExtension = el.href.split('.')[
        document.querySelectorAll('a[download]')[0].href.split('.').length - 1
      ];
      let fullName = `${fileName}.${fileExtension}`;
      el.download = fullName;
    });
  });
};

const rateContent = async (page, content_name) => {
  return await page.evaluate((content_name) => {
    document
      .querySelectorAll(`a[download="${content_name}"]`)[0]
      .parentElement.parentElement.children[1].children[1].children[0].click();
  }, content_name);
};

const downloadContent = async (page, course_name, content) => {
  const download = (url, file_path, file_name) => {
    if (!fs.existsSync(file_path)) fs.mkdirSync(file_path, { recursive: true });

    console.log(`[-] Downloading file (${file_name})...`);

    return new Promise((resolve, reject) => {
      httpntlm.get(
        {
          ...userAuthData,
          url: url,
          binary: true,
        },
        (err, res) => {
          // Request failed
          if (err) {
            console.log(
              'There is an error in the request, please report it. Error is: ',
              err.message
            );
            reject('Request Error');
          }

          // Request success, write to the file
          fs.writeFile(`${file_path}/${file_name}`, res.body, (err) => {
            if (err) {
              console.log(
                'There is an error in file writing, please report it. Error is: ',
                err.message
              );
              reject('FileWriting Error');
            }
            console.log(
              `[+] Download completed. "${file_name}" is saved successfully in ${file_path}`
            );
            console.log('==============================');
            resolve();
          });
        }
      );
    });
  };

  const dir_name = `./${course_name}`;
  for (let i = 0; i < content.length; i++) {
    await download(
      content[i].link,
      `${dir_name}/${content[i].week}`,
      content[i].name
    );

    // Rate the downloaded content
    await rateContent(page, content[i].name);
  }
};

(async () => {
  const browser = await puppeteer.launch(pupp_options);
  const page = await browser.newPage();
  page.authenticate(userAuthData);

  // 0- Go to home page
  await navigateTo(
    page,
    'https://cms.guc.edu.eg/apps/student/HomePageStn.aspx'
  );

  // 1- Get Available Courses
  const available_courses = await getAvailableCourses(page);
  

  for (let i = 0; i < available_courses.length; i++) {
    await navigateTo(page, available_courses[i]);
    const course_name = await getCourseName(page);

    // Adjust download names
    await resolveContentName(page);

    // Get unrated courses
    const unrated_content = await getUnratedContent(page);
    console.log(unrated_content);

    // Start downloading everything 🔥
    await downloadContent(page, course_name, unrated_content);
  }
  await browser.close();
})();
