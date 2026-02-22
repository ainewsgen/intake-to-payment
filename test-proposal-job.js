const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('BROWSER CONSOLE ERROR:', msg.text());
        }
    });

    console.log('Navigating to login...');
    await page.goto('http://localhost:3000/login');
    
    await page.fill('input[type="email"]', 'admin@demo.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    
    console.log('Navigating to proposals...');
    await page.goto('http://localhost:3000/proposals');
    await page.waitForTimeout(2000);

    // click on the first proposal link
    const rows = await page.$$('table tbody tr');
    if (rows.length > 0) {
        const link = await rows[0].$('a');
        if (link) {
            console.log('Clicking on proposal link...');
            await link.click();
            await page.waitForTimeout(2000);
            
            // Wait for add job button
            const addJobBtn = await page.$('button:text("+ Add Job")');
            if (addJobBtn) {
                console.log('Clicking Add Job button...');
                await addJobBtn.click();
                await page.waitForTimeout(1000);
                
                // Fill the form
                await page.fill('input[placeholder="e.g. Phase 1 - Discovery"]', 'Test Job via Script');
                
                const submitBtn = await page.$('button:text("Add Job")');
                if (submitBtn) {
                    console.log('Submitting Add Job form...');
                    await submitBtn.click();
                    await page.waitForTimeout(3000);
                    console.log('Job submitted.');
                }
            } else {
                console.log('No Add Job button found. Maybe proposal is not in DRAFT?');
            }
        }
    }
    
    await browser.close();
    console.log('Done.');
})();
