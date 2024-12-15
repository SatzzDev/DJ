const request = require("request");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const ora = require("ora");

const soundcloud = async (link, spinner) => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      url: "https://www.forhub.io/download.php",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      formData: {
        formurl: link,
      },
    };

    request(options, async function (error, response, body) {
      if (error) {
        spinner.fail("Error occurred while processing: " + link);
        reject(error);
        return;
      }

      const $ = cheerio.load(body);
      const result = {
        judul: $("table tbody tr:nth-child(1) td:nth-child(2)")
          .text()
          .trim()
          .split("Save Link")[0],
        thumb: $("table tbody tr:nth-child(1) td:nth-child(1) img").attr("src"),
        link: $("#dlMP3")
          .attr("onclick")
          ?.split(`downloadFile('`)[1]
          ?.split(`',`)[0],
      };

      if (!result.judul || !result.link) {
        spinner.fail("Failed to retrieve data for: " + link);
        reject(new Error("Failed to retrieve necessary data."));
        return;
      }

      // Download the audio file
      const audioFilePath = path.join(__dirname, "audio", `${result.judul}.mp3`);
      request(result.link)
        .pipe(fs.createWriteStream(audioFilePath))
        .on("finish", () => {
          spinner.succeed(`Downloaded: ${result.judul}`);

          // Save metadata to info.json
          const infoFilePath = path.join(__dirname, "audio", "info.json");
          let infoData = [];
          if (fs.existsSync(infoFilePath)) {
            const fileContent = fs.readFileSync(infoFilePath, "utf-8");
            infoData = JSON.parse(fileContent);
          }

          infoData.push({
            judul: result.judul,
            thumb: result.thumb,
            link: "audio/" + result.judul,
          });

          fs.writeFileSync(infoFilePath, JSON.stringify(infoData, null, 2));

          resolve(infoData);
        })
        .on("error", (err) => {
          spinner.fail("Error saving audio for: " + link);
          reject(err);
        });
    });
  });
};

const processAllLinks = async (links) => {
  const spinner = ora("Starting process...").start();

  try {
    for (let link of links) {
      spinner.text = `Processing: ${link}`;
      await soundcloud(link, spinner);
    }
    spinner.succeed("All tasks completed successfully!");
  } catch (err) {
    spinner.fail("Process failed: " + err.message);
  }
};

// Array of SoundCloud URLs
const soundcloudLinks = [
  "https://soundcloud.com/yusrizal-elkis/dj-lala-mp-club-vvip-ami15-new",
  "https://soundcloud.com/user-824699875/dj-lala-mp-club-vvip-7-agustus",
  "https://soundcloud.com/arya-radja/dj-lala-mp-club-6-maret-vvip",
];

// Create the audio folder if it doesn't exist
const audioFolderPath = path.join(__dirname, "audio");
if (!fs.existsSync(audioFolderPath)) {
  fs.mkdirSync(audioFolderPath);
}

// Start processing
processAllLinks(soundcloudLinks);
