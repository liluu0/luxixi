async(page)=>{
 const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:1050});
 await page.goto('http://127.0.0.1:5187/works/city-heatmap');
 await page.getByRole('heading',{name:'城市热力脉冲实验室',exact:true}).waitFor();
 for(const [code,value] of [['ECONOMY','47,219'],['TOURISM','94'],['HOUSING','65,400'],['POPULATION','2,487']]){
   await page.locator('.metric-tabs button').filter({hasText:code}).click();
   assert(await page.locator('.city-value strong').innerText()===value,code+' original value');
 }
 await page.getByRole('combobox',{name:'选择对比城市'}).selectOption('深圳');
 assert((await page.locator('.compare-bars').innerText()).includes('1,779'),'City comparison');
 await page.getByRole('button',{name:'气泡',exact:true}).click();
 assert(await page.locator('.bubble').count()===34,'Bubble capitals');
 await page.getByRole('button',{name:'热力',exact:true}).click();
 await page.getByRole('textbox',{name:'搜索城市或地区'}).fill('深圳');
 await page.locator('.search-results button').click();
 const dlPromise=page.waitForEvent('download');await page.getByRole('button',{name:'导出样本 CSV'}).click();
 const dl=await dlPromise, stream=await dl.createReadStream();let csv='';for await(const c of stream)csv+=c.toString('utf8');
 assert(csv.includes('深圳,广东省,1779,34606,91,71800') && csv.trim().split('\n').length===2,'Export filtered samples');
 const core=page.locator('.node .core');
 const before=await core.boundingBox();
 await page.mouse.move(before.x+before.width/2,before.y+before.height/2);
 await page.mouse.wheel(0,-150);
 await page.waitForTimeout(180);
 const after=await core.boundingBox();
 assert(Math.abs(before.width-after.width)<.1,'Marker screen size stays fixed');
 assert(Math.abs((before.x+before.width/2)-(after.x+after.width/2))<1,'Wheel x anchor');
 assert(Math.abs((before.y+before.height/2)-(after.y+after.height/2))<1,'Wheel y anchor');
 await page.getByRole('button',{name:'全国',exact:true}).click();
 await page.getByRole('button',{name:'查看四川省详情',exact:true}).focus();
 await page.keyboard.press('Enter');
 assert((await page.locator('.province-title').innerText()).includes('四川省'),'Keyboard province');
 const options=await page.getByRole('combobox',{name:'地区筛选'}).locator('option').allTextContents();
 for(const name of options.slice(1)){
   await page.getByRole('combobox',{name:'地区筛选'}).selectOption({label:name});
   assert((await page.locator('.province-title').innerText()).includes(name),'Province detail '+name);
   assert((await page.locator('.province-summary').innerText()).length>10,'Province description '+name);
 }
 await page.getByRole('button',{name:'全国',exact:true}).click();
 await page.setViewportSize({width:390,height:844});
 const box=await page.locator('.map').boundingBox();await page.locator('.map').scrollIntoViewIfNeeded();
 const rect=await page.locator('.map').boundingBox();
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+110,y:rect.y+140,id:1},{x:rect.x+210,y:rect.y+140,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x+60,y:rect.y+140,id:1},{x:rect.x+260,y:rect.y+140,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert((await page.locator('.map-bottom').innerText()).includes('2.00'),'Touch pinch zoom');
 await cdp.detach();
 await page.getByRole('combobox',{name:'地区筛选'}).selectOption('江苏省');
 await page.setViewportSize({width:1440,height:1050});
 await page.getByRole('button',{name:'进入全屏',exact:true}).click();
 assert(await page.evaluate(()=>!!document.fullscreenElement),'Fullscreen');
 await page.getByRole('button',{name:'退出全屏',exact:true}).click();
 await page.getByRole('button',{name:'返回作品集'}).click();
 assert(page.url()==='http://127.0.0.1:5187/','Return to unchanged homepage');
 await page.goBack();await page.getByRole('heading',{name:'城市热力脉冲实验室',exact:true}).waitFor();
 assert(!errors.length,'Runtime errors '+errors.join(';'));
}
