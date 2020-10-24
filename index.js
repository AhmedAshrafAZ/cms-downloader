'use strict';
const puppeteer = require('puppeteer');
require('dotenv').config();

const pupp_options = {
  headless: true,
  timeout: 500000,
};

const navigateTo = async (page, target_link) => {
  await page.goto(target_link, {
    waitUntil: 'networkidle0',
  });
};

const getAvailableCourses = async (page) => {
  console.log('Fetching Course...');
  return await page.evaluate(() => {
    const courses_menu = document.querySelectorAll(
      'ul[class="vertical-nav-menu metismenu"]'
    )[0].childNodes[5].childNodes[3].childNodes;
    let courses_links = [];
    for (var i = 1; i < courses_menu.length; i += 2) {
      if (!courses_menu[i].children[0].href.includes('ViewAllCourseStn'))
        courses_links.push(courses_menu[i].children[0].href.trim());
    }
    return courses_links;
  });
};

(async () => {
  const browser = await puppeteer.launch(pupp_options);
  const page = await browser.newPage();
  page.authenticate({
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
  });

  // 0- Go to home page
  await navigateTo(
    page,
    'https://cms.guc.edu.eg/apps/student/HomePageStn.aspx'
  );

  // 1- Get Available Courses
  const available_courses = await getAvailableCourses(page);
  console.log('Fetching Courses Done: ', available_courses);

  // The Rest Of The Script
  await browser.close();
})();
