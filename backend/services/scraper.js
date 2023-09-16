const puppeteer = require('puppeteer');

async function scrapeRealEstateData() {
	try {
		console.log('started scraping...');
		// const browser = await puppeteer.launch({ headless: false, slowMo: 250 });
		// const browser = await puppeteer.launch({ headless: "new" });

		const browser = await puppeteer.launch();
		const page = await browser.newPage();

		await page.goto('https://www.imot.bg/pcgi/imot.cgi');
		await page.click('.fc-button-label');
		await page.click('.mapBtnProdajbi');
		await page.click('input[type="button"][value="Т Ъ Р С И"]');
		await delay(5000);

		const listingUrls = await page.$$eval('a.lnk3', links => links.map(link => link.href));
		const validListingUrls = listingUrls.filter(url => !url.startsWith('javascript:'));

		const realEstateData = [];

		for (const url of validListingUrls) {
			try {
				await page.goto(url);

				const isPriceUnavailable = await page.evaluate(() => {
					const textToCheck = 'При запитване';
					return document.body.textContent.includes(textToCheck);
				});

				if (isPriceUnavailable) {
					console.log(`Price is unavailable for URL: ${url}`);
					continue;
				}

				await page.waitForSelector('.title');
				await page.waitForSelector('#cenakv');
				await page.waitForSelector('#bigPictureCarousel');
				await page.waitForSelector('.phone');
				await page.waitForSelector('.adParams div:first-child');
				await page.waitForSelector('#description_div');

				const title = (await page.$eval('.title', el => el.textContent)).trim();
				let sqm = (await page.$eval('#cenakv', el => el.textContent)).trim();
				const image = (await page.$eval('#bigPictureCarousel', el => el.src)).trim();
				const phone = (await page.$eval('.phone', el => el.textContent)).trim();
				let area = (await page.$eval('.adParams div:first-child', el => el.textContent)).trim();
				const description = (await page.$eval('#description_div', el => el.textContent)).trim();

				if (area.includes(':')) {
					area = area.split(':')[1].trim();
				}

				if (sqm.includes('(')) {
					sqm = sqm.replace(/\(|\)/g, '');
				}

				const scrapedInfo = { title, sqm, image, phone, area, description, url };
				console.log('Scraped Info:', scrapedInfo);

				realEstateData.push(scrapedInfo);
			} catch (error) {
				console.error(`Error scraping data for URL: ${url}`, error);
			}
		}

		// await page.screenshot({ path: 'listings.png', fullPage: true });

		await browser.close();
		console.log('finished scraping!');

		return realEstateData;
	} catch (error) {
		console.error('Error scraping real estate data:', error);
		return null;
	}
}

async function scrapeDataWithRetry() {
	const maxRetries = 3;
	let retryCount = 0;

	while (retryCount < maxRetries) {
		try {
			const realEstateData = await scrapeRealEstateData();

			if (realEstateData) {
				console.log(`Data scraped at Attempt ${++retryCount}`);
				return realEstateData;
			}
		} catch (error) {
			console.error(`Error scraping real estate data (Attempt ${retryCount + 1}):`, error);
			retryCount++;

			await delay(3000);
		}
	}

	console.error('Max retries reached. Scraping failed.');
	return null;
}

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
	scrapeRealEstateData,
	scrapeDataWithRetry,
};
