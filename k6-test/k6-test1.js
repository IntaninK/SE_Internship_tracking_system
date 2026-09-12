// import http from 'k6/http';
// import { check, sleep, group } from 'k6';

// export const options = {
//   stages: [
//     { duration: '1m', target: 100 }, // Ramp-up to 100 VUs over 1 minute
//     { duration: '2m', target: 100 }, // Stay at 100 VUs for 2 minutes
//     { duration: '1m', target: 0 },   // Ramp-down to 0 VUs over 1 minute
//   ],
//   vus: 295,
//   duration: '3m',
// };

// const BASE_URL = 'http://localhost:3000/pages';

// const pages = [
//   'login.html',
//   'dashboard.html',
//   'dashboard_ที่ปรึกษา.html',
//   'dashboard_รายวิชา.html',
//   'admin_student_detail.html',
//   'advisor_checklist_review.html',
//   'Certificate.html',
//   'checklist.html',
//   'CV.html',
//   'Personal_Information.html',
//   'Profile.html',
//   'status_all.html',
//   'submission_status.html',
// ];

// export default function () {
//   pages.forEach((page) => {
//     group(page, function () {
//       const res = http.get(`${BASE_URL}/${page}`);
//       check(res, {
//         [`${page} - status 200`]: (r) => r.status === 200,
//         [`${page} - response < 500ms`]: (r) => r.timings.duration < 500,
//       });
//     });
//     sleep(1);
//   });
// }



import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 300,
  duration: '30s',
};

export default function () {
  const res = http.get('http://localhost:3000/pages/login.html');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'transaction time OK': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
