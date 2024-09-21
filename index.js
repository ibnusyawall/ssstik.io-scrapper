const axios = require('axios');
const cheerio = require('cheerio');

const baseUrl = 'https://ssstik.io';
const regexTiktokUrl = /https:\/\/(?:m|www|vm|vt|lite)?\.?tiktok\.com\/((?:.*\b(?:(?:usr|v|embed|user|video|photo)\/|\?shareId=|\&item_id=)(\d+))|\w+)/;
const regexSsstikToken = /s_tt\s*=\s*'([^']+)'/;
const regexOverlayUrl = /#mainpicture \.result_overlay\s*{\s*background-image:\s*url\(["']?([^"']+)["']?\);\s*}/;

const extractToken = async () => {
  // get html document
  try {
    let { data: html } = await axios.get(baseUrl)
    // check if document have a variable s_tt with regexSsstikToken
    let matchedToken = html.match(regexSsstikToken);
    if (matchedToken && matchedToken.length > 1) {
      let ssstik_token = matchedToken[1]
      return Promise.resolve({ token: ssstik_token })
    } else {
      return Promise.reject('Can\'t getting the ssstik token.')
    }
  } catch (error) {
    return Promise.reject('Something went wrong.');
  }
}

const Ssstik = async () => {
  // check and getting the arguments
  let args = process.argv.splice(2);
  if (args.length <= 0) {
    return Promise.reject('The argumnets must a valid url.')
  } else {
    // let's validate the tiktok input url with regex
    let url = args.join(' ')
    if (!regexTiktokUrl.test(url)) {
      return Promise.reject('Must be a valid tiktok url.')
    } else {
      // getting token ssstik.io 
      try {
        let { token } = await extractToken();
        try {
          // let's post to extract html data user
          basePostUrl = `${baseUrl}/abc?url=dl`;
          let formData = new FormData()
          formData.append('id', url)
          formData.append('locale', 'en')
          formData.append('tt', token)

          let { data: html } = await axios.post(basePostUrl, formData, {
            headers: {
              origin: baseUrl,
              referer: `${baseUrl}/en`,
              'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            } 
          }, {
            retires: 10, // retry up to 10x
          })

          // let's scrapping the data user 
          let $ = cheerio.load(html);          

          // getting username, description, count of like, comment and share, etc...
          let username = $('h2').text().trim();
          let description = $('.maintext').text().trim();
          let likeCount = $('div.trending-actions > div.justify-content-start').eq(0).text().trim();
          let commentCount = $('div.trending-actions > div.justify-content-center > div').text().trim();
          let shareCount = $('div.trending-actions > div.justify-content-end > div').text().trim();
          let avatarUrl = $('img.result_author').attr('src');
          let videoUrl = $('a.without_watermark').attr('href');
          let musicUrl = $('a.music').attr('href');

          // parse style to getting overlay url
          let styleContent = $('style').html();
          let overlayMatch = styleContent.match(regexOverlayUrl);
          let overlayUrl = overlayMatch ? overlayMatch[1] : null;

          return Promise.resolve({
            username,
            description,
            statistics: {
              likeCount,
              commentCount,
              shareCount
            },
            downloads: {
              avatarUrl,
              overlayUrl,
              videoUrl,
              musicUrl
            },
          })
        } catch (error) {
          return Promise.reject(error)
        }
      } catch(error) {
        return Promise.reject(error)
      }
    }
  }
}

Ssstik().then((data) => console.log(data)).catch((error) => console.error(error))

