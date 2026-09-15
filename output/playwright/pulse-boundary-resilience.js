async(page)=>{
 const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
 await page.goto('http://127.0.0.1:5187/works/city-heatmap');
 await page.getByRole('heading',{name:'城市热力脉冲实验室',exact:true}).waitFor();
 await page.route('**/assets/city-heatmap/regions/320000.json',route=>route.fulfill({status:503,body:'unavailable'}));
 await page.getByRole('combobox',{name:'地区筛选'}).selectOption('江苏省');
 await page.getByRole('button',{name:'边界加载失败，重试'}).waitFor();
 assert(await page.locator('.province-cities button').count()===13,'Details survive load failure');
 await page.unroute('**/assets/city-heatmap/regions/320000.json');
 await page.getByRole('button',{name:'边界加载失败，重试'}).click();
 await page.locator('.city-boundaries path').first().waitFor();
 assert(await page.locator('.city-boundaries path').count()===13,'Boundary retry');
 await page.reload();await page.getByRole('heading',{name:'城市热力脉冲实验室',exact:true}).waitFor();
 await page.route('**/assets/city-heatmap/regions/320000.json',async route=>{await page.waitForTimeout(800);await route.continue()});
 const requested=page.waitForRequest('**/assets/city-heatmap/regions/320000.json');
 await page.getByRole('combobox',{name:'地区筛选'}).selectOption('江苏省');await requested;
 await page.getByRole('combobox',{name:'地区筛选'}).selectOption('广东省');
 await page.waitForTimeout(1300);
 assert((await page.locator('.province-title').innerText()).includes('广东省'),'Late load preserves current province');
 assert(await page.locator('.city-boundaries path').count()===21,'Only current region boundaries');
 await page.unroute('**/assets/city-heatmap/regions/320000.json');
 await page.getByRole('button',{name:'全国',exact:true}).click();
}
