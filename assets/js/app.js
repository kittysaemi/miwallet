// ── DB ──
const DB={
  get(k){try{return JSON.parse(localStorage.getItem('miwallet_'+k))||[];}catch{return[];}},
  getStr(k){return localStorage.getItem('miwallet_'+k)||'';},
  set(k,v){localStorage.setItem('miwallet_'+k,JSON.stringify(v));},
  setStr(k,v){localStorage.setItem('miwallet_'+k,v);},
  id(){return Date.now()+'_'+Math.random().toString(36).slice(2,7);}
};

// ── 초기 데이터 ──
function initData(){
  if(DB.getStr('init')==='1')return;
  const icons=[
    {icon_id:DB.id(),icon_value:'wallet',show:true},
    {icon_id:DB.id(),icon_value:'credit-card',show:true},
    {icon_id:DB.id(),icon_value:'home',show:true},
    {icon_id:DB.id(),icon_value:'shopping-cart',show:true},
    {icon_id:DB.id(),icon_value:'utensils',show:true},
    {icon_id:DB.id(),icon_value:'car',show:true},
    {icon_id:DB.id(),icon_value:'heart',show:true},
    {icon_id:DB.id(),icon_value:'star',show:true},
    {icon_id:DB.id(),icon_value:'gift',show:true},
    {icon_id:DB.id(),icon_value:'piggy-bank',show:true}
  ];
  DB.set('icons',icons);
  const im={};icons.forEach(i=>im[i.icon_value]=i.icon_id);
  DB.set('accounts',[{wallet_id:DB.id(),icon_id:im['wallet'],account_name:'현금',initial_balance:0,current_balance:0,use_yn:'Y'}]);
  DB.set('cards',[]);
  DB.set('categories',[
    {category_id:DB.id(),icon_id:im['utensils'],category_name:'식비',show:true},
    {category_id:DB.id(),icon_id:im['car'],category_name:'교통',show:true},
    {category_id:DB.id(),icon_id:im['shopping-cart'],category_name:'쇼핑',show:true},
    {category_id:DB.id(),icon_id:im['wallet'],category_name:'급여',show:true},
    {category_id:DB.id(),icon_id:im['star'],category_name:'기타',show:true}
  ]);
  DB.set('transactions',[]);
  DB.setStr('init','1');
}

// ── 유틸 ──
const U={
  fmt(n){return'₩'+Math.abs(Number(n)||0).toLocaleString('ko-KR');},
  today(){return new Date().toISOString().slice(0,10);},
  icon(id){const l=DB.get('icons');const i=l.find(x=>x.icon_id===id);return i?i.icon_value:'circle';},
  cat(id){return DB.get('categories').find(x=>x.category_id===id)||{category_name:'?',icon_id:''};},
  acc(id){return DB.get('accounts').find(x=>x.wallet_id===id)||{account_name:'?'};},
  card(id){return DB.get('cards').find(x=>x.wallet_id===id)||{card_name:'?'};},
  wallet(id,type){return type==='card'?this.card(id):this.acc(id);},
  walletIcon(id,type){const w=this.wallet(id,type);return this.icon(w.icon_id);},
  cls(t){return t==='income'?'income':t==='card'?'card':'expense';},
  lbl(t){return t==='income'?'수입':t==='card'?'카드':'지출';},
  txs(){return DB.get('transactions').filter(x=>x.deleted_yn!=='Y');}
};

// ── Toast ──
function toast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg;el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2200);
}

// ── Lucide 아이콘 SVG 생성 ──
function iconSVG(name,size=18){
  // Lucide 아이콘을 i 태그로 만들어 createIcons로 렌더링
  return`<i data-lucide="${name}" style="width:${size}px;height:${size}px;display:block;"></i>`;
}
function ri(){if(window.lucide)lucide.createIcons();}
function setIconPreview(id,name,size=20){
  const el=document.getElementById(id);
  if(!el)return;
  el.innerHTML=name?iconSVG(name,size):'';
  ri();
}
function escHTML(v){
  return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

// ── 데이터 관리 ──
const DataMgr={
  toggle(e){
    e.stopPropagation();
    const dd=document.getElementById('data-dropdown');
    dd.classList.toggle('open');
  },
  close(){
    document.getElementById('data-dropdown').classList.remove('open');
  },
  exportData(){
    this.close();
    const data={
      version:1,
      exported_at:new Date().toISOString(),
      nickname:DB.getStr('nickname'),
      accounts:DB.get('accounts'),
      cards:DB.get('cards'),
      categories:DB.get('categories'),
      icons:DB.get('icons'),
      transactions:DB.get('transactions')
    };
    const json=JSON.stringify(data,null,2);
    const blob=new Blob([json],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const date=new Date().toISOString().slice(0,10).replace(/-/g,'');
    a.href=url;
    a.download='미냥이지갑_'+date+'.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('📤 내보내기 완료! 파일을 구글 드라이브에 저장하세요.');
  },
  importData(){
    this.close();
    document.getElementById('import-file-input').value='';
    document.getElementById('import-file-input').click();
  },
  onFileSelected(e){
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(!data.version||!data.accounts||!data.transactions)
          throw new Error('형식 오류');
        if(!confirm('현재 데이터를 불러온 데이터로 교체합니다.\n계속하시겠어요?'))return;
        if(data.nickname)DB.setStr('nickname',data.nickname);
        if(data.accounts)DB.set('accounts',data.accounts);
        if(data.cards)DB.set('cards',data.cards);
        if(data.categories)DB.set('categories',data.categories);
        if(data.icons)DB.set('icons',data.icons);
        if(data.transactions)DB.set('transactions',data.transactions);
        DB.setStr('init','1');
        toast('📥 불러오기 완료!');
        Home.render();ri();
      }catch(err){
        alert('올바른 미냥이지갑 백업 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
  },
  reset(){
    this.close();
    if(!confirm('모든 데이터가 삭제되고 초기화됩니다.\n정말 초기화하시겠어요?'))return;
    ['nickname','accounts','cards','categories','icons','transactions','init']
      .forEach(k=>localStorage.removeItem('miwallet_'+k));
    initData();
    DB.setStr('init','1');
    toast('🗑️ 초기화 완료');
    Home.render();ri();
  },
  repairKoreanDefaults(){
    this.close();
    if(!confirm('깨진 기본 계좌/카테고리 이름을 정상 한글로 다시 저장합니다.\n거래 내역은 삭제되지 않습니다.'))return;

    const accountDefaults={wallet:'현금'};
    const categoryDefaults={
      utensils:'식비',
      car:'교통',
      'shopping-cart':'쇼핑',
      wallet:'급여',
      star:'기타'
    };

    const brokenText=/[�꾧툑앸쇳湲됱뿬援먰넻]/;
    const accounts=DB.get('accounts');
    let changed=0;
    accounts.forEach(account=>{
      const icon=U.icon(account.icon_id);
      if(accountDefaults[icon]&&brokenText.test(account.account_name)){
        account.account_name=accountDefaults[icon];
        changed++;
      }
    });
    DB.set('accounts',accounts);

    const categories=DB.get('categories');
    categories.forEach(category=>{
      const icon=U.icon(category.icon_id);
      if(categoryDefaults[icon]&&brokenText.test(category.category_name)){
        category.category_name=categoryDefaults[icon];
        changed++;
      }
    });
    DB.set('categories',categories);

    toast(changed?'한글 기본값을 복구했어요!':'복구할 기본값이 없어요.');
    Home.render();
    Add.loadCats();
    Add.loadWallets();
    if(Stat.y)Stat.render();
    Manage.render();
    ri();
  }
};
// 드롭다운 외부 클릭 닫기
document.addEventListener('click',()=>{
  DataMgr.close();
  document.querySelectorAll('.icon-select.open').forEach(el=>el.classList.remove('open'));
});

// ── App ──
const App={
  cur:'home',
  navigate(n){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById('screen-'+n).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
    const nav=document.querySelector('[data-nav="'+n+'"]');
    if(nav)nav.classList.add('active');
    document.getElementById('bottom-nav').style.display=n==='setup'?'none':'flex';
    this.cur=n;
    if(n==='home')Home.render();
    if(n==='add')Add.init();
    if(n==='search')Search.init();
    if(n==='stat')Stat.init();
    if(n==='manage')Manage.init();
    ri();
  },
  saveNickname(){
    const v=document.getElementById('setup-nickname').value.trim();
    if(!v){toast('닉네임을 입력해 주세요!');return;}
    DB.setStr('nickname',v);this.navigate('home');
  },
  openModal(id){document.getElementById(id).classList.add('open');ri();},
  closeModal(id){document.getElementById(id).classList.remove('open');}
};

// ── Home ──
const Home={
  render(){
    const nick=DB.getStr('nickname');
    document.getElementById('home-nickname').textContent=nick+'님의 지갑';
    document.getElementById('home-greeting').textContent=nick+'님, 안녕하세요! 🐾';
    const now=new Date();
    document.getElementById('home-today').textContent=now.getFullYear()+'.'+(now.getMonth()+1)+'.'+now.getDate();
    const ym=now.toISOString().slice(0,7);
    const txs=U.txs().filter(t=>t.transaction_date.startsWith(ym));
    const income=txs.filter(t=>t.transaction_type==='income').reduce((s,t)=>s+Number(t.amount),0);
    const expense=txs.filter(t=>t.transaction_type!=='income').reduce((s,t)=>s+Number(t.amount),0);
    document.getElementById('home-income').textContent=U.fmt(income);
    document.getElementById('home-expense').textContent=U.fmt(expense);
    const bal=DB.get('accounts').reduce((s,a)=>s+Number(a.current_balance),0);
    document.getElementById('home-balance').textContent=U.fmt(bal);
    const recent=U.txs().sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,5);
    const el=document.getElementById('home-tx-list');
    if(!recent.length){el.innerHTML='<div class="empty-state"><p>아직 내역이 없어요 🐱</p></div>';ri();return;}
    el.innerHTML=recent.map(t=>this.txHTML(t)).join('');ri();
  },
  txHTML(t){
    const cat=U.cat(t.category_id);
    const sign=t.transaction_type==='income'?'+':'-';
    return`<div class="tx-item" onclick="Detail.open('${t.transaction_id}')">
      <div class="tx-icon">${iconSVG(U.icon(cat.icon_id),18)}</div>
      <div class="tx-info"><div class="cat">${cat.category_name}</div>
        <div class="date">${t.transaction_date}${t.memo?' · '+t.memo:''}</div></div>
      <div class="tx-amount ${U.cls(t.transaction_type)}">${sign}${U.fmt(t.amount)}</div>
    </div>`;
  }
};

// ── Add ──
const Add={
  type:'income',
  init(){
    this.type='income';
    document.querySelectorAll('#screen-add .type-tab').forEach(el=>{
      el.classList.remove('active');
      if(el.dataset.type==='income')el.classList.add('active');
    });
    document.getElementById('add-amount').value='';
    document.getElementById('add-amount-display').textContent='0';
    document.getElementById('add-memo').value='';
    document.getElementById('add-date').value=U.today();
    document.getElementById('add-date').max=U.today();
    this.loadCats();this.loadWallets();
  },
  setType(t){
    this.type=t;
    document.querySelectorAll('#screen-add .type-tab').forEach(el=>{
      el.classList.remove('active');
      if(el.dataset.type===t)el.classList.add('active');
    });
    this.loadWallets();
  },
  loadCats(){
    const cats=DB.get('categories').filter(c=>c.show);
    document.getElementById('add-category').innerHTML=
      cats.map(c=>`<option value="${c.category_id}">${c.category_name}</option>`).join('');
    this.renderPicker('category',cats.map(c=>({
      value:c.category_id,
      label:c.category_name,
      icon:U.icon(c.icon_id)
    })));
  },
  loadWallets(){
    const lbl=document.getElementById('add-wallet-label');
    const sel=document.getElementById('add-wallet');
    if(this.type==='card'){
      lbl.textContent='카드';
      const list=DB.get('cards').filter(c=>c.use_yn==='Y');
      sel.innerHTML=list.length?list.map(c=>`<option value="${c.wallet_id}">${c.card_name}</option>`).join('')
        :'<option value="">카드 없음</option>';
      this.renderPicker('wallet',list.map(c=>({
        value:c.wallet_id,
        label:c.card_name,
        icon:U.icon(c.icon_id)
      })));
    }else{
      lbl.textContent='계좌';
      const list=DB.get('accounts').filter(a=>a.use_yn==='Y');
      sel.innerHTML=list.length?list.map(a=>`<option value="${a.wallet_id}">${a.account_name}</option>`).join('')
        :'<option value="">계좌 없음</option>';
      this.renderPicker('wallet',list.map(a=>({
        value:a.wallet_id,
        label:a.account_name,
        icon:U.icon(a.icon_id)
      })));
    }
  },
  renderPicker(kind,items){
    const selectId=kind==='category'?'add-category':'add-wallet';
    const picker=document.getElementById(kind==='category'?'add-category-picker':'add-wallet-picker');
    const select=document.getElementById(selectId);
    if(!picker||!select)return;
    if(!items.length){
      picker.classList.remove('open');
      picker.innerHTML=`<div class="icon-select-empty">${kind==='category'?'카테고리 없음':this.type==='card'?'카드 없음':'계좌 없음'}</div>`;
      return;
    }
    if(!items.find(item=>item.value===select.value))select.value=items[0].value;
    const cur=items.find(item=>item.value===select.value)||items[0];
    picker.innerHTML=`<button type="button" class="icon-select-trigger" onclick="Add.togglePicker('${kind}',event)">
        <span class="icon-select-icon">${iconSVG(cur.icon,18)}</span><span>${escHTML(cur.label)}</span>
      </button>
      <div class="icon-select-menu">
        ${items.map(item=>`<button type="button" class="icon-select-option ${item.value===select.value?'selected':''}" onclick="Add.selectPicker('${kind}','${item.value}')">
          <span class="icon-select-icon">${iconSVG(item.icon,18)}</span><span>${escHTML(item.label)}</span>
        </button>`).join('')}
      </div>`;
    ri();
  },
  togglePicker(kind,e){
    e.stopPropagation();
    const pickerId=kind==='category'?'add-category-picker':'add-wallet-picker';
    document.querySelectorAll('#screen-add .icon-select').forEach(el=>{
      if(el.id!==pickerId)el.classList.remove('open');
    });
    document.getElementById(pickerId)?.classList.toggle('open');
  },
  selectPicker(kind,value){
    const select=document.getElementById(kind==='category'?'add-category':'add-wallet');
    if(select)select.value=value;
    if(kind==='category'){
      const cats=DB.get('categories').filter(c=>c.show);
      this.renderPicker('category',cats.map(c=>({value:c.category_id,label:c.category_name,icon:U.icon(c.icon_id)})));
    }else if(this.type==='card'){
      const list=DB.get('cards').filter(c=>c.use_yn==='Y');
      this.renderPicker('wallet',list.map(c=>({value:c.wallet_id,label:c.card_name,icon:U.icon(c.icon_id)})));
    }else{
      const list=DB.get('accounts').filter(a=>a.use_yn==='Y');
      this.renderPicker('wallet',list.map(a=>({value:a.wallet_id,label:a.account_name,icon:U.icon(a.icon_id)})));
    }
  },
  updateAmountDisplay(){
    const v=document.getElementById('add-amount').value;
    document.getElementById('add-amount-display').textContent=v?Number(v).toLocaleString('ko-KR'):'0';
  },
  save(){
    const amount=Number(document.getElementById('add-amount').value);
    const cat=document.getElementById('add-category').value;
    const wallet=document.getElementById('add-wallet').value;
    const date=document.getElementById('add-date').value;
    const memo=document.getElementById('add-memo').value.trim();
    if(!amount||amount<=0){toast('금액을 입력해 주세요!');return;}
    if(!cat){toast('카테고리를 선택해 주세요!');return;}
    if(!wallet){toast(this.type==='card'?'카드를 선택해 주세요!':'계좌를 선택해 주세요!');return;}
    if(!date||date>U.today()){toast('날짜를 확인해 주세요!');return;}
    const tx={transaction_id:DB.id(),transaction_type:this.type,amount,
      transaction_date:date,category_id:cat,wallet_id:wallet,
      wallet_type:this.type==='card'?'card':'account',
      memo,deleted_yn:'N',created_at:new Date().toISOString(),updated_at:''};
    const txs=DB.get('transactions');txs.push(tx);DB.set('transactions',txs);
    this.updateBal(wallet,this.type,amount,1);
    toast('저장했어요! 🐾');this.init();App.navigate('home');
  },
  updateBal(wid,type,amount,dir){
    if(type==='card')return;
    const accs=DB.get('accounts');
    const i=accs.findIndex(a=>a.wallet_id===wid);if(i<0)return;
    if(type==='income')accs[i].current_balance=Number(accs[i].current_balance)+dir*amount;
    else accs[i].current_balance=Number(accs[i].current_balance)-dir*amount;
    DB.set('accounts',accs);
  }
};

// ── Search ──
const Search={
  tab:'period',ptype:'daily',
  init(){
    document.getElementById('search-date').value=U.today();
    document.getElementById('search-month').value=U.today().slice(0,7);
    const t=U.today();
    document.getElementById('search-from').value=t.slice(0,8)+'01';
    document.getElementById('search-to').value=t;
    document.getElementById('search-results').innerHTML='';
  },
  setTab(t){
    this.tab=t;
    document.getElementById('stab-period').classList.toggle('active',t==='period');
    document.getElementById('stab-keyword').classList.toggle('active',t==='keyword');
    document.getElementById('search-period-panel').style.display=t==='period'?'block':'none';
    document.getElementById('search-keyword-panel').style.display=t==='keyword'?'block':'none';
    document.getElementById('search-results').innerHTML='';
  },
  setPeriodType(t){
    this.ptype=t;
    ['daily','monthly','range'].forEach(p=>{
      document.getElementById('pt-'+p).classList.toggle('active',p===t);
      document.getElementById('search-'+p+'-ctrl').style.display=p===t?'block':'none';
    });
  },
  runPeriod(){
    let txs=U.txs();
    if(this.ptype==='daily')txs=txs.filter(t=>t.transaction_date===document.getElementById('search-date').value);
    else if(this.ptype==='monthly')txs=txs.filter(t=>t.transaction_date.startsWith(document.getElementById('search-month').value));
    else{const f=document.getElementById('search-from').value,to=document.getElementById('search-to').value;txs=txs.filter(t=>t.transaction_date>=f&&t.transaction_date<=to);}
    this.render(txs);
  },
  runKeyword(){
    const kw=document.getElementById('search-keyword').value.trim().toLowerCase();
    if(!kw){document.getElementById('search-results').innerHTML='';return;}
    const cats=DB.get('categories');
    this.render(U.txs().filter(t=>{
      const c=cats.find(x=>x.category_id===t.category_id);
      return(t.memo||'').toLowerCase().includes(kw)||(c&&c.category_name.toLowerCase().includes(kw));
    }));
  },
  render(txs){
    const el=document.getElementById('search-results');
    if(!txs.length){el.innerHTML='<div class="empty-state"><p>결과가 없어요 🐱</p></div>';return;}
    el.innerHTML='<div class="card">'+txs.sort((a,b)=>b.transaction_date.localeCompare(a.transaction_date)).map(t=>Home.txHTML(t)).join('')+'</div>';
    ri();
  }
};

// ── Stat ──
const Stat={
  y:0,m:0,bar:null,donut:null,
  init(){
    const now=new Date();
    if(!this.y){this.y=now.getFullYear();this.m=now.getMonth()+1;}
    this.render();
  },
  prevMonth(){this.m--;if(this.m<1){this.m=12;this.y--;}this.render();},
  nextMonth(){this.m++;if(this.m>12){this.m=1;this.y++;}this.render();},
  ym(){return this.y+'-'+String(this.m).padStart(2,'0');},
  render(){
    document.getElementById('stat-month-label').textContent=this.y+'년 '+this.m+'월';
    const txs=U.txs().filter(t=>t.transaction_date.startsWith(this.ym()));
    const inc=txs.filter(t=>t.transaction_type==='income').reduce((s,t)=>s+Number(t.amount),0);
    const exp=txs.filter(t=>t.transaction_type!=='income').reduce((s,t)=>s+Number(t.amount),0);
    document.getElementById('stat-income').textContent=U.fmt(inc);
    document.getElementById('stat-expense').textContent=U.fmt(exp);
    this.renderBar();this.renderDonut(txs);
  },
  renderBar(){
    const months=[];
    for(let i=5;i>=0;i--){const d=new Date(this.y,this.m-1-i,1);months.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));}
    const all=U.txs();
    const data=months.map(m=>all.filter(t=>t.transaction_date.startsWith(m)&&t.transaction_type!=='income').reduce((s,t)=>s+Number(t.amount),0));
    const labels=months.map(m=>{const p=m.split('-');return p[1]+'월';});
    if(this.bar)this.bar.destroy();
    this.bar=new Chart(document.getElementById('chart-bar'),{
      type:'bar',
      data:{labels,datasets:[{label:'지출',data,backgroundColor:'rgba(255,120,170,.75)',borderRadius:8,borderSkipped:false}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{y:{beginAtZero:true,ticks:{callback:v=>'₩'+Number(v).toLocaleString()}}}}
    });
  },
  renderDonut(txs){
    const exp=txs.filter(t=>t.transaction_type!=='income');
    const map={};
    exp.forEach(t=>{const c=U.cat(t.category_id);map[c.category_name]=(map[c.category_name]||0)+Number(t.amount);});
    const labels=Object.keys(map),data=Object.values(map);
    const colors=['#ff78aa','#e44986','#cf3e7b','#ffb8d1','#ffd6ea','#ff99c2','#bd346d','#e85f97'];
    if(this.donut)this.donut.destroy();
    const leg=document.getElementById('chart-legend');
    if(!labels.length){leg.innerHTML='<p style="text-align:center;color:var(--muted);font-size:13px;padding:16px;">이번 달 지출이 없어요</p>';return;}
    this.donut=new Chart(document.getElementById('chart-donut'),{
      type:'doughnut',
      data:{labels,datasets:[{data,backgroundColor:colors.slice(0,labels.length),borderWidth:2,borderColor:'#fff'}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'62%'}
    });
    const total=data.reduce((s,v)=>s+v,0);
    leg.innerHTML=labels.map((l,i)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12px;">
      <span style="width:10px;height:10px;border-radius:3px;background:${colors[i]};flex-shrink:0;"></span>
      <span style="flex:1;">${l}</span>
      <span style="color:var(--muted);">${total?Math.round(data[i]/total*100):0}%</span>
      <span style="font-weight:700;">${U.fmt(data[i])}</span></div>`).join('');
  }
};

// ── Manage ──
const Manage={
  tab:'account',editId:null,selIcon:null,
  init(){this.setTab('account');},
  setTab(t){
    this.tab=t;
    ['account','card','category','icon'].forEach(x=>document.getElementById('mtab-'+x).classList.toggle('active',x===t));
    this.render();
  },
  render(){
    const el=document.getElementById('manage-content');
    if(this.tab==='account')el.innerHTML=this.rAccounts();
    else if(this.tab==='card')el.innerHTML=this.rCards();
    else if(this.tab==='category')el.innerHTML=this.rCats();
    else el.innerHTML=this.rIcons();
    ri();
  },
  rAccounts(){
    const list=DB.get('accounts');
    if(!list.length)return'<div class="empty-state"><p>계좌를 등록해 주세요</p></div>';
    return list.map(a=>`<div class="manage-list-item ${a.use_yn==='Y'?'':'disabled'}">
      <div class="item-icon">${iconSVG(U.icon(a.icon_id),18)}</div>
      <div class="item-info"><div class="item-name">${a.account_name}</div>
        <div class="item-sub">${U.fmt(a.current_balance)}</div></div>
      <div class="item-actions">
        <div class="toggle ${a.use_yn==='Y'?'on':''}" onclick="event.stopPropagation();Manage.togAcc('${a.wallet_id}')"></div>
        <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;" ${a.use_yn==='Y'?'':'disabled'} onclick="Manage.editAccount('${a.wallet_id}')">수정</button>
      </div></div>`).join('');
  },
  rCards(){
    const list=DB.get('cards');
    if(!list.length)return'<div class="empty-state"><p>카드를 등록해 주세요</p></div>';
    return list.map(c=>`<div class="manage-list-item ${c.use_yn==='Y'?'':'disabled'}">
      <div class="item-icon">${iconSVG(U.icon(c.icon_id),18)}</div>
      <div class="item-info"><div class="item-name">${c.card_name}</div></div>
      <div class="item-actions">
        <div class="toggle ${c.use_yn==='Y'?'on':''}" onclick="event.stopPropagation();Manage.togCard('${c.wallet_id}')"></div>
        <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;" ${c.use_yn==='Y'?'':'disabled'} onclick="Manage.editCard('${c.wallet_id}')">수정</button>
      </div></div>`).join('');
  },
  rCats(){
    const list=DB.get('categories');
    if(!list.length)return'<div class="empty-state"><p>카테고리를 등록해 주세요</p></div>';
    return list.map(c=>`<div class="manage-list-item ${c.show?'':'disabled'}">
      <div class="item-icon">${iconSVG(U.icon(c.icon_id),18)}</div>
      <div class="item-info"><div class="item-name">${c.category_name}</div></div>
      <div class="item-actions">
        <div class="toggle ${c.show?'on':''}" onclick="event.stopPropagation();Manage.togCat('${c.category_id}')"></div>
        <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;" ${c.show?'':'disabled'} onclick="Manage.editCat('${c.category_id}')">수정</button>
      </div></div>`).join('');
  },
  rIcons(){
    const list=DB.get('icons');
    if(!list.length)return'<div class="empty-state"><p>아이콘을 등록해 주세요</p></div>';
    return `<div class="manage-icon-grid">${list.map(i=>`<button class="manage-icon-tile ${i.show?'on':'off'}" onclick="Manage.togIcon('${i.icon_id}')" title="${i.icon_value}" aria-label="${i.icon_value}">
      ${iconSVG(i.icon_value,26)}
    </button>`).join('')}</div>`;
  },
  togAcc(id){const l=DB.get('accounts'),i=l.findIndex(a=>a.wallet_id===id);if(i<0)return;l[i].use_yn=l[i].use_yn==='Y'?'N':'Y';DB.set('accounts',l);this.render();},
  togCard(id){const l=DB.get('cards'),i=l.findIndex(c=>c.wallet_id===id);if(i<0)return;l[i].use_yn=l[i].use_yn==='Y'?'N':'Y';DB.set('cards',l);this.render();},
  togCat(id){const l=DB.get('categories'),i=l.findIndex(c=>c.category_id===id);if(i<0)return;l[i].show=!l[i].show;DB.set('categories',l);this.render();},
  togIcon(id){const l=DB.get('icons'),i=l.findIndex(x=>x.icon_id===id);if(i<0)return;l[i].show=!l[i].show;DB.set('icons',l);this.render();},
  openAdd(){
    this.editId=null;this.selIcon=null;
    if(this.tab==='account'){
      document.getElementById('modal-account-title').textContent='계좌 등록';
      document.getElementById('acc-name').value='';
      document.getElementById('acc-balance').value='';
      this.loadIconGrid('acc-icon-grid',null);App.openModal('modal-account');
    }else if(this.tab==='card'){
      document.getElementById('modal-card-title').textContent='카드 등록';
      document.getElementById('card-name').value='';
      this.loadIconGrid('card-icon-grid',null);App.openModal('modal-card');
    }else if(this.tab==='category'){
      document.getElementById('modal-cat-title').textContent='카테고리 등록';
      document.getElementById('cat-name').value='';
      this.loadIconGrid('cat-icon-grid',null);App.openModal('modal-category');
    }else{
      document.getElementById('icon-value').value='';
      document.getElementById('icon-preview-el').innerHTML='';
      App.openModal('modal-icon');
    }
  },
  loadIconGrid(gid,sel){
    this.selIcon=sel;
    const icons=DB.get('icons').filter(i=>i.show);
    document.getElementById(gid).innerHTML=icons.map(i=>`<div class="icon-option ${sel===i.icon_id?'selected':''}" onclick="Manage.selectIcon('${i.icon_id}','${gid}')">
      ${iconSVG(i.icon_value,20)}<span>${i.icon_value}</span></div>`).join('');
    ri();
  },
  selectIcon(id,gid){
    this.selIcon=id;
    document.querySelectorAll('#'+gid+' .icon-option').forEach(el=>el.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
  },
  editAccount(id){
    this.editId=id;
    const a=DB.get('accounts').find(x=>x.wallet_id===id);if(!a)return;
    document.getElementById('modal-account-title').textContent='계좌 수정';
    document.getElementById('acc-name').value=a.account_name;
    document.getElementById('acc-balance').value=a.current_balance;
    this.loadIconGrid('acc-icon-grid',a.icon_id);App.openModal('modal-account');
  },
  saveAccount(){
    const name=document.getElementById('acc-name').value.trim();
    const balance=Number(document.getElementById('acc-balance').value)||0;
    if(!name){toast('계좌명을 입력해 주세요!');return;}
    if(!this.selIcon){toast('아이콘을 선택해 주세요!');return;}
    const list=DB.get('accounts');
    if(this.editId){
      const i=list.findIndex(a=>a.wallet_id===this.editId);
      if(list.find((a,j)=>j!==i&&a.account_name===name)){toast('이미 있는 계좌명이에요!');return;}
      list[i].account_name=name;list[i].current_balance=balance;list[i].icon_id=this.selIcon;
    }else{
      if(list.find(a=>a.account_name===name)){toast('이미 있는 계좌명이에요!');return;}
      list.push({wallet_id:DB.id(),icon_id:this.selIcon,account_name:name,initial_balance:balance,current_balance:balance,use_yn:'Y'});
    }
    DB.set('accounts',list);App.closeModal('modal-account');this.render();toast('저장했어요! 🐾');
  },
  editCard(id){
    this.editId=id;
    const c=DB.get('cards').find(x=>x.wallet_id===id);if(!c)return;
    document.getElementById('modal-card-title').textContent='카드 수정';
    document.getElementById('card-name').value=c.card_name;
    this.loadIconGrid('card-icon-grid',c.icon_id);App.openModal('modal-card');
  },
  saveCard(){
    const name=document.getElementById('card-name').value.trim();
    if(!name){toast('카드명을 입력해 주세요!');return;}
    if(!this.selIcon){toast('아이콘을 선택해 주세요!');return;}
    const list=DB.get('cards');
    if(this.editId){const i=list.findIndex(c=>c.wallet_id===this.editId);list[i].card_name=name;list[i].icon_id=this.selIcon;}
    else list.push({wallet_id:DB.id(),icon_id:this.selIcon,card_name:name,use_yn:'Y'});
    DB.set('cards',list);App.closeModal('modal-card');this.render();toast('저장했어요! 🐾');
  },
  editCat(id){
    this.editId=id;
    const c=DB.get('categories').find(x=>x.category_id===id);if(!c)return;
    document.getElementById('modal-cat-title').textContent='카테고리 수정';
    document.getElementById('cat-name').value=c.category_name;
    this.loadIconGrid('cat-icon-grid',c.icon_id);App.openModal('modal-category');
  },
  saveCategory(){
    const name=document.getElementById('cat-name').value.trim();
    if(!name){toast('카테고리명을 입력해 주세요!');return;}
    if(!this.selIcon){toast('아이콘을 선택해 주세요!');return;}
    const list=DB.get('categories');
    if(this.editId){const i=list.findIndex(c=>c.category_id===this.editId);list[i].category_name=name;list[i].icon_id=this.selIcon;}
    else list.push({category_id:DB.id(),icon_id:this.selIcon,category_name:name,show:true});
    DB.set('categories',list);App.closeModal('modal-category');this.render();toast('저장했어요! 🐾');
  },
  previewIcon(){
    const v=document.getElementById('icon-value').value.trim();
    const el=document.getElementById('icon-preview-el');
    el.innerHTML=v?iconSVG(v,24):'';ri();
  },
  saveIcon(){
    const v=document.getElementById('icon-value').value.trim().toLowerCase();
    if(!v){toast('아이콘 이름을 입력해 주세요!');return;}
    const list=DB.get('icons');
    if(list.find(i=>i.icon_value===v)){toast('이미 등록된 아이콘이에요!');return;}
    list.push({icon_id:DB.id(),icon_value:v,show:true});
    DB.set('icons',list);App.closeModal('modal-icon');this.render();toast('등록했어요! 🐾');
  }
};

// ── Detail ──
const Detail={
  id:null,
  open(id){
    this.id=id;
    const t=U.txs().find(x=>x.transaction_id===id);if(!t)return;
    const cat=U.cat(t.category_id);
    const wallet=t.wallet_type==='card'?U.card(t.wallet_id):U.acc(t.wallet_id);
    const wname=t.wallet_type==='card'?wallet.card_name:wallet.account_name;
    const sign=t.transaction_type==='income'?'+':'-';
    document.getElementById('detail-content').innerHTML=`
      <div class="detail-row"><span class="dlabel">유형</span><span class="dvalue"><span class="badge badge-${U.cls(t.transaction_type)}">${U.lbl(t.transaction_type)}</span></span></div>
      <div class="detail-row"><span class="dlabel">금액</span><span class="dvalue" style="color:${t.transaction_type==='income'?'var(--success)':'var(--danger)'}">${sign}${U.fmt(t.amount)}</span></div>
      <div class="detail-row"><span class="dlabel">카테고리</span><span class="dvalue detail-value-icon"><span class="mini-icon">${iconSVG(U.icon(cat.icon_id),16)}</span>${cat.category_name}</span></div>
      <div class="detail-row"><span class="dlabel">${t.wallet_type==='card'?'카드':'계좌'}</span><span class="dvalue detail-value-icon"><span class="mini-icon">${iconSVG(U.icon(wallet.icon_id),16)}</span>${wname}</span></div>
      <div class="detail-row"><span class="dlabel">날짜</span><span class="dvalue">${t.transaction_date}</span></div>
      ${t.memo?`<div class="detail-row"><span class="dlabel">메모</span><span class="dvalue">${t.memo}</span></div>`:''}`;
    App.openModal('modal-detail');
  },
  edit(){const t=U.txs().find(x=>x.transaction_id===this.id);if(!t)return;App.closeModal('modal-detail');Edit.open(t);},
  delete(){
    if(!confirm('이 내역을 삭제할까요?'))return;
    const txs=DB.get('transactions');
    const i=txs.findIndex(x=>x.transaction_id===this.id);if(i<0)return;
    const t=txs[i];txs[i].deleted_yn='Y';DB.set('transactions',txs);
    if(t.wallet_type==='account'){
      const accs=DB.get('accounts'),ai=accs.findIndex(a=>a.wallet_id===t.wallet_id);
      if(ai>=0){
        if(t.transaction_type==='income')accs[ai].current_balance=Number(accs[ai].current_balance)-Number(t.amount);
        else accs[ai].current_balance=Number(accs[ai].current_balance)+Number(t.amount);
        DB.set('accounts',accs);
      }
    }
    App.closeModal('modal-detail');toast('삭제했어요!');
    if(App.cur==='home')Home.render();
    if(App.cur==='search')Search.runPeriod();
  }
};

// ── Edit ──
const Edit={
  tx:null,type:'income',
  open(t){
    this.tx=t;this.type=t.transaction_type;
    document.querySelectorAll('#modal-edit .type-tab').forEach(el=>{
      el.classList.remove('active');
      if(el.dataset.etype===t.transaction_type)el.classList.add('active');
    });
    document.getElementById('edit-amount').value=t.amount;
    document.getElementById('edit-date').value=t.transaction_date;
    document.getElementById('edit-date').max=U.today();
    document.getElementById('edit-memo').value=t.memo||'';
    const cats=DB.get('categories').filter(c=>c.show);
    document.getElementById('edit-category').innerHTML=cats.map(c=>`<option value="${c.category_id}" ${c.category_id===t.category_id?'selected':''}>${c.category_name}</option>`).join('');
    this.loadWallets(t.wallet_type,t.wallet_id);
    this.updateSelectIcons();
    App.openModal('modal-edit');
  },
  setType(t){
    this.type=t;
    document.querySelectorAll('#modal-edit .type-tab').forEach(el=>{
      el.classList.remove('active');
      if(el.dataset.etype===t)el.classList.add('active');
    });
    this.loadWallets(t==='card'?'card':'account',null);
  },
  loadWallets(wtype,sel){
    const lbl=document.getElementById('edit-wallet-label');
    const s=document.getElementById('edit-wallet');
    if(wtype==='card'||this.type==='card'){
      lbl.textContent='카드';
      s.innerHTML=DB.get('cards').filter(c=>c.use_yn==='Y').map(c=>`<option value="${c.wallet_id}" ${c.wallet_id===sel?'selected':''}>${c.card_name}</option>`).join('');
    }else{
      lbl.textContent='계좌';
      s.innerHTML=DB.get('accounts').filter(a=>a.use_yn==='Y').map(a=>`<option value="${a.wallet_id}" ${a.wallet_id===sel?'selected':''}>${a.account_name}</option>`).join('');
    }
    this.updateSelectIcons();
  },
  updateSelectIcons(){
    const catId=document.getElementById('edit-category')?.value;
    const walletId=document.getElementById('edit-wallet')?.value;
    const cat=catId?U.cat(catId):null;
    const walletType=this.type==='card'?'card':'account';
    setIconPreview('edit-category-icon',cat?U.icon(cat.icon_id):'',20);
    setIconPreview('edit-wallet-icon',walletId?U.walletIcon(walletId,walletType):'',20);
  },
  save(){
    const amount=Number(document.getElementById('edit-amount').value);
    const cat=document.getElementById('edit-category').value;
    const wallet=document.getElementById('edit-wallet').value;
    const date=document.getElementById('edit-date').value;
    const memo=document.getElementById('edit-memo').value.trim();
    if(!amount||amount<=0){toast('금액을 입력해 주세요!');return;}
    if(!wallet){toast('계좌/카드를 선택해 주세요!');return;}
    if(date>U.today()){toast('미래 날짜는 입력할 수 없어요!');return;}
    const old=this.tx;
    // 기존 잔액 복구
    if(old.wallet_type==='account'){
      const accs=DB.get('accounts'),i=accs.findIndex(a=>a.wallet_id===old.wallet_id);
      if(i>=0){
        if(old.transaction_type==='income')accs[i].current_balance=Number(accs[i].current_balance)-Number(old.amount);
        else accs[i].current_balance=Number(accs[i].current_balance)+Number(old.amount);
        DB.set('accounts',accs);
      }
    }
    // 새 잔액 반영
    const wtype=this.type==='card'?'card':'account';
    if(wtype==='account'){
      const accs=DB.get('accounts'),i=accs.findIndex(a=>a.wallet_id===wallet);
      if(i>=0){
        if(this.type==='income')accs[i].current_balance=Number(accs[i].current_balance)+amount;
        else accs[i].current_balance=Number(accs[i].current_balance)-amount;
        DB.set('accounts',accs);
      }
    }
    const txs=DB.get('transactions'),i=txs.findIndex(x=>x.transaction_id===old.transaction_id);
    txs[i]={...txs[i],transaction_type:this.type,amount,transaction_date:date,category_id:cat,wallet_id:wallet,wallet_type:wtype,memo,updated_at:new Date().toISOString()};
    DB.set('transactions',txs);
    App.closeModal('modal-edit');toast('수정했어요! 🐾');
    if(App.cur==='home')Home.render();
    if(App.cur==='search')Search.runPeriod();
  }
};

// ── 초기화 ──
(function(){
  initData();
  const nick=DB.getStr('nickname');
  if(nick){
    document.getElementById('bottom-nav').style.display='flex';
    App.navigate('home');
  }else{
    document.getElementById('bottom-nav').style.display='none';
    App.navigate('setup');
  }
  document.getElementById('setup-nickname').addEventListener('keydown',e=>{if(e.key==='Enter')App.saveNickname();});
  // Lucide 로드 후 아이콘 적용
  const checkLucide=setInterval(()=>{
    if(window.lucide){clearInterval(checkLucide);lucide.createIcons();}
  },100);
})();
