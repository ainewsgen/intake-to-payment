const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('BROWSER CONSOLE ERROR:', msg.text());
        }
    });

    page.on('pageerror', error => {
        console.log('PAGE EXCEPTION:', error.message);
        console.log('PAGE STACK:', error.stack);
    });

    console.log('Navigating to login...');
    await page.goto('http://localhost:3000/login');
    
    await page.fill('input[type="email"]', 'admin@demo.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for navigation...');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    
    console.log('Navigating to rate cards...');
    await page.goto('http://localhost:3000/rate-cards');
    await page.waitForTimeout(5000);
    
    await browser.close();
    console.log('Done.');
})();
