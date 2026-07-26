const $ = id => document.getElementById(id);
const client = window.supabase.createClient(
  window.TOPDECK_SUPABASE_URL,
  window.TOPDECK_SUPABASE_ANON_KEY
);

let artists = [];
let releases = [];
let selectedArtistId = null;
let selectedReleaseId = null;
let workspaceDirty = false;

function setNotice(id,message,type=""){
  const el=$(id);
  if(!el)return;
  el.textContent=message;
  el.className=`notice ${type}`.trim();
}

function escapeHtml(value=""){
  return String(value).replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[c]);
}

function formatDate(value){
  if(!value)return "Not set";
  const date=new Date(value);
  return Number.isNaN(date.getTime())?value:date.toLocaleDateString("en-US",{
    year:"numeric",month:"short",day:"numeric"
  });
}

function toDateInput(value){
  if(!value)return "";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "";
  return date.toISOString().slice(0,10);
}

function normalizeDistributionStatus(value){
  return value || "Submitted";
}

function statusClass(value){
  return `status-${normalizeDistributionStatus(value).toLowerCase().replace(/\s+/g,"-")}`;
}

function artistForRelease(release){
  return artists.find(a=>a.user_id===release.user_id);
}

$("togglePassword").onclick=()=>{
  const input=$("password");
  const showing=input.type==="text";
  input.type=showing?"password":"text";
  $("togglePassword").textContent=showing?"Show password":"Hide password";
};

$("loginBtn").onclick=async()=>{
  const email=$("email").value.trim();
  const password=$("password").value;
  setNotice("loginStatus","Signing in...");
  const {error}=await client.auth.signInWithPassword({email,password});
  if(error)return setNotice("loginStatus",error.message,"error");
  await verifyAdmin();
};

$("signOutBtn").onclick=async()=>{
  await client.auth.signOut();
  location.reload();
};

$("commandTab").onclick=()=>showView("command");
$("catalogTab").onclick=()=>showView("catalog");
$("artistsTab").onclick=()=>showView("artists");
$("profileTab").onclick=()=>showView("profile");
$("distributionTab").onclick=()=>showView("distribution");
$("workspaceTab").onclick=()=>showView("workspace");
$("backToDistributionBtn").onclick=()=>showView("distribution");
$("commandRefreshBtn").onclick=loadCRM;
$("catalogRefreshBtn").onclick=loadCRM;
$("refreshBtn").onclick=loadCRM;
$("distributionRefreshBtn").onclick=loadCRM;
$("artistSearch").oninput=renderArtists;
$("artistStatusFilter").onchange=renderArtists;
$("releaseSearch").oninput=renderDistribution;
$("distributionStatusFilter").onchange=renderDistribution;
$("releaseTypeFilter").onchange=renderDistribution;
$("catalogSearch").oninput=renderCatalog;
$("catalogWorkflowFilter").onchange=renderCatalog;
$("catalogTypeFilter").onchange=renderCatalog;
$("saveProfileBtn").onclick=saveArtistProfile;
$("saveWorkspaceBtn").onclick=saveReleaseWorkspace;
$("sendDistributionBtn").onclick=sendToDistribution;
$("workspaceChecklist").onclick=handleChecklistClick;
["workspaceDistributionStatus","workspaceReleaseDate","workspaceISRCSource","workspaceISRC","workspaceUPCSource","workspaceUPC","workspacePublisher","workspaceCopyright","workspaceMarketing","workspaceCopyrightReview","workspaceDistributionApproved"]
  .forEach(id=>$(id).addEventListener("input",()=>{
    workspaceDirty=true;
    renderLiveReadiness();
    renderSaveState();
  }));

$("workspaceISRC").addEventListener("input",()=>autoSelectExisting("workspaceISRCSource","workspaceISRC"));
$("workspaceUPC").addEventListener("input",()=>autoSelectExisting("workspaceUPCSource","workspaceUPC"));


const CHECKLIST_TARGETS = {
  releaseDate:"workspaceReleaseDate",
  publisher:"workspacePublisher",
  copyright:"workspaceCopyright",
  marketing:"workspaceMarketing",
  isrc:"workspaceISRCSource",
  upc:"workspaceUPCSource",
  copyrightReview:"workspaceCopyrightReview",
  distributionApproved:"workspaceDistributionApproved"
};

function autoSelectExisting(sourceId,inputId){
  const source=$(sourceId);
  const input=$(inputId);
  if(input.value.trim() && source.value==="pending") source.value="existing";
}

function renderSaveState(){
  const btn=$("saveWorkspaceBtn");
  if(!btn)return;
  btn.textContent=workspaceDirty?"Save V7.2.2 Changes":"Saved";
  btn.classList.toggle("has-changes",workspaceDirty);
}

function handleChecklistClick(event){
  const item=event.target.closest("[data-readiness-key]");
  if(!item)return;
  const targetId=CHECKLIST_TARGETS[item.dataset.readinessKey];
  if(!targetId)return;
  const target=$(targetId);
  target.scrollIntoView({behavior:"smooth",block:"center"});
  setTimeout(()=>target.focus(),250);
}

function validateCodeSelections(values){
  const errors=[];
  const isrc=values.isrc.replace(/-/g,"").toUpperCase();
  const upc=values.upc.replace(/\D/g,"");
  if(values.isrc_source==="existing" && !/^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/.test(isrc)){
    errors.push("Enter a valid 12-character ISRC when Artist Provided is selected.");
  }
  if(values.upc_source==="existing" && !/^\d{12,14}$/.test(upc)){
    errors.push("Enter a valid 12–14 digit UPC when Artist Provided is selected.");
  }
  return errors;
}

const READINESS_ITEMS = [
  {key:"artwork",label:"Cover Artwork",weight:10,owner:"artist"},
  {key:"audio",label:"Audio Uploaded",weight:10,owner:"artist"},
  {key:"title",label:"Song Title",weight:7,owner:"artist"},
  {key:"artist",label:"Artist Linked",weight:7,owner:"artist"},
  {key:"releaseDate",label:"Release Date",weight:8,owner:"artist"},
  {key:"publisher",label:"Publisher",weight:6,owner:"artist"},
  {key:"copyright",label:"Copyright Owner",weight:6,owner:"artist"},
  {key:"marketing",label:"Marketing Assets",weight:8,owner:"artist"},
  {key:"isrc",label:"ISRC Handled",weight:10,owner:"label"},
  {key:"upc",label:"UPC Handled",weight:10,owner:"label"},
  {key:"copyrightReview",label:"Copyright Review",weight:8,owner:"label"},
  {key:"distributionApproved",label:"Distribution Approval",weight:10,owner:"label"}
];

function codeHandled(source,code){
  const normalized=source||"pending";
  if(normalized==="existing")return Boolean(String(code||"").trim());
  return normalized==="top_deck"||normalized==="not_required";
}

function readinessData(release,overrides={}){
  const artist=artistForRelease(release);
  const isrcSource=overrides.isrc_source??release.isrc_source??"pending";
  const upcSource=overrides.upc_source??release.upc_source??"pending";
  const isrcCode=overrides.isrc??release.isrc??"";
  const upcCode=overrides.upc??release.upc??"";
  const values={
    artwork:Boolean(release.cover_url||release.cover_art_url||release.artwork_url),
    audio:Boolean(release.audio_url||release.audio_file_url||release.song_url),
    title:Boolean(String(release.title||"").trim()),
    artist:Boolean(artist?.artist_name||artist?.legal_name),
    releaseDate:Boolean(overrides.release_date??release.release_date),
    publisher:Boolean(String(overrides.publisher??release.publisher??"").trim()),
    copyright:Boolean(String(overrides.copyright_owner??release.copyright_owner??"").trim()),
    marketing:Boolean(overrides.marketing_complete??release.marketing_complete),
    isrc:codeHandled(isrcSource,isrcCode),
    upc:codeHandled(upcSource,upcCode),
    copyrightReview:Boolean(overrides.copyright_review_complete??release.copyright_review_complete),
    distributionApproved:Boolean(overrides.distribution_approved??release.distribution_approved)
  };
  const score=READINESS_ITEMS.reduce((sum,item)=>sum+(values[item.key]?item.weight:0),0);
  const ownerScore=owner=>{
    const items=READINESS_ITEMS.filter(item=>item.owner===owner);
    const total=items.reduce((sum,item)=>sum+item.weight,0);
    const earned=items.reduce((sum,item)=>sum+(values[item.key]?item.weight:0),0);
    return Math.round((earned/total)*100);
  };
  const artistCompletion=ownerScore("artist");
  const labelCompletion=ownerScore("label");
  const missingItems=READINESS_ITEMS.filter(item=>!values[item.key]);
  const artistMissing=missingItems.filter(item=>item.owner==="artist").map(item=>item.label);
  const labelMissing=missingItems.filter(item=>item.owner==="label").map(item=>item.label);
  let workflowStatus="Ready for Distribution";
  if(artistMissing.length)workflowStatus="Waiting on Artist";
  else if(labelMissing.length)workflowStatus="Waiting on Top Deck";
  return {
    values,score,artistCompletion,labelCompletion,workflowStatus,
    missing:missingItems.map(item=>item.label),artistMissing,labelMissing
  };
}

function workspaceOverrides(){
  return {
    distribution_status:$("workspaceDistributionStatus").value,
    release_date:$("workspaceReleaseDate").value||null,
    isrc_source:$("workspaceISRCSource").value,
    isrc:$("workspaceISRC").value.trim(),
    upc_source:$("workspaceUPCSource").value,
    upc:$("workspaceUPC").value.trim(),
    publisher:$("workspacePublisher").value.trim(),
    copyright_owner:$("workspaceCopyright").value.trim(),
    marketing_complete:$("workspaceMarketing").value==="true",
    copyright_review_complete:$("workspaceCopyrightReview").value==="true",
    distribution_approved:$("workspaceDistributionApproved").value==="true"
  };
}

function renderWorkflowStatus(result){
  const badge=$("workspaceWorkflowBadge");
  badge.textContent=result.workflowStatus;
  badge.className="workflow-badge "+(
    result.workflowStatus==="Ready for Distribution"?"workflow-ready":
    result.workflowStatus==="Waiting on Top Deck"?"workflow-label":"workflow-artist"
  );
  $("workspaceArtistCompletion").textContent=`${result.artistCompletion}%`;
  $("workspaceLabelCompletion").textContent=`${result.labelCompletion}%`;
  $("workspaceArtistFill").style.width=`${result.artistCompletion}%`;
  $("workspaceLabelFill").style.width=`${result.labelCompletion}%`;
}

function renderReadiness(release,overrides={}){
  const result=readinessData(release,overrides);
  $("workspaceReadinessScore").textContent=`${result.score}%`;
  $("workspaceReadinessFill").style.width=`${result.score}%`;
  $("workspaceReadinessFill").parentElement.setAttribute("aria-label",`${result.score}% release readiness`);
  renderWorkflowStatus(result);

  let state="🔴 Needs Work";
  if(result.score===100)state="🟢 Ready for Distribution";
  else if(result.score>=75)state="🟡 Almost Ready";
  else if(result.score>=50)state="🟠 In Progress";
  $("workspaceReadinessState").textContent=result.missing.length?`${state} • Missing: ${result.missing.join(", ")}`:state;

  $("workspaceChecklist").innerHTML=READINESS_ITEMS.map(item=>{
    const target=CHECKLIST_TARGETS[item.key];
    return `
    <div class="check-item ${result.values[item.key]?"complete":""} ${target&&!result.values[item.key]?"clickable":""}" data-readiness-key="${item.key}" ${target&&!result.values[item.key]?'title="Click to jump to this field"':''}>
      <span class="check-icon">${result.values[item.key]?"✓":"○"}</span>
      <span>${escapeHtml(item.label)} <small>(${item.owner==="artist"?"Artist":"Top Deck"} • ${item.weight}%)</small></span>
      ${target&&!result.values[item.key]?'<span class="jump-hint">Fix →</span>':''}
    </div>`;
  }).join("");

  const owner=result.artistMissing.length?"Artist":result.labelMissing.length?"Top Deck":"Nobody";
  const next=result.artistMissing[0]||result.labelMissing[0]||"Release is complete";
  $("workspaceNextAction").innerHTML=result.score===100
    ? '<strong>Next action:</strong> Send this release to distribution.'
    : `<strong>Next action — ${owner}:</strong> ${escapeHtml(next)}`;

  const sendBtn=$("sendDistributionBtn");
  sendBtn.disabled=result.score!==100;
  sendBtn.title=result.score===100?"Mark this release Ready for Distribution":`Complete: ${result.missing.join(", ")}`;
  return result;
}

function renderLiveReadiness(){
  const release=releases.find(r=>String(r.id)===String(selectedReleaseId));
  if(release)renderReadiness(release,workspaceOverrides());
}

function showView(view){
  const views={
    command:"commandView",
    catalog:"catalogView",
    artists:"artistsView",
    profile:"profileView",
    distribution:"distributionView",
    workspace:"workspaceView"
  };
  Object.entries(views).forEach(([name,id])=>{
    $(id).classList.toggle("hidden",name!==view);
  });

  const tabs={
    command:"commandTab",
    catalog:"catalogTab",
    artists:"artistsTab",
    profile:"profileTab",
    distribution:"distributionTab",
    workspace:"workspaceTab"
  };
  Object.entries(tabs).forEach(([name,id])=>{
    $(id).classList.toggle("active",name===view);
  });
}

async function verifyAdmin(){
  const {data:{user}}=await client.auth.getUser();
  if(!user)return;

  const {data,error}=await client
    .from("admin_users")
    .select("user_id")
    .eq("user_id",user.id)
    .maybeSingle();

  if(error||!data){
    await client.auth.signOut();
    return setNotice("loginStatus","This account does not have admin access.","error");
  }

  $("loginCard").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  $("signOutBtn").classList.remove("hidden");
  await loadCRM();
  showView("command");
}

async function loadCRM(){
  setNotice("crmStatus","Loading roster...");
  setNotice("distributionStatus","Loading distribution queue...");

  const [artistsResult,releasesResult]=await Promise.all([
    client.from("artist_profiles").select("*").order("artist_name",{ascending:true}),
    client.from("release_submissions").select("*").order("created_at",{ascending:false})
  ]);

  if(artistsResult.error){
    setNotice("crmStatus",artistsResult.error.message,"error");
    return;
  }
  if(releasesResult.error){
    setNotice("distributionStatus",releasesResult.error.message,"error");
    return;
  }

  artists=artistsResult.data||[];
  releases=releasesResult.data||[];

  $("artistCount").textContent=artists.length;
  $("releaseCount").textContent=releases.length;
  $("reviewCount").textContent=releases.filter(r=>
    ["Submitted","Reviewing","Needs Changes"].includes(normalizeDistributionStatus(r.distribution_status))
  ).length;
  $("readyCount").textContent=releases.filter(r=>
    ["Approved","Ready for Distribution"].includes(normalizeDistributionStatus(r.distribution_status))
  ).length;
  $("scheduledCount").textContent=releases.filter(r=>
    normalizeDistributionStatus(r.distribution_status)==="Scheduled"
  ).length;
  $("releasedCount").textContent=releases.filter(r=>
    normalizeDistributionStatus(r.distribution_status)==="Released"
  ).length;

  renderCommandCenter();
  renderCatalog();
  renderArtists();
  renderDistribution();

  setNotice("commandStatus","Operations center updated.","success");
  setNotice("catalogStatus",`${releases.length} catalog record${releases.length===1?"":"s"} loaded.`,"success");
  setNotice("crmStatus","Roster loaded.","success");
  setNotice("distributionStatus","Distribution queue loaded.","success");
}


function dateInCurrentWeek(value){
  if(!value)return false;
  const d=new Date(value); if(Number.isNaN(d.getTime()))return false;
  const now=new Date(); const day=(now.getDay()+6)%7;
  const start=new Date(now); start.setHours(0,0,0,0); start.setDate(now.getDate()-day);
  const end=new Date(start); end.setDate(start.getDate()+7);
  return d>=start&&d<end;
}

function dateInCurrentMonth(value){
  if(!value)return false; const d=new Date(value); if(Number.isNaN(d.getTime()))return false;
  const now=new Date(); return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();
}

function priorityForRelease(release){
  const data=readinessData(release);
  const artist=artistForRelease(release);
  const who=artist?.artist_name||artist?.legal_name||"Unknown Artist";
  const title=release.title||"Untitled Release";
  let action="Review release"; let owner="Top Deck";
  if(data.artistMissing.length){action=`Get ${data.artistMissing[0]} from ${who}`;owner="Artist";}
  else if(data.labelMissing.length){action=`Complete ${data.labelMissing[0]} for ${title}`;owner="Top Deck";}
  else {action=`Send ${title} to distribution`;owner="Top Deck";}
  return {action,owner,data,title,who};
}

function renderCommandCenter(){
  const summaries=releases.map(r=>({release:r,...priorityForRelease(r)}));
  $("commandNew").textContent=releases.filter(r=>normalizeDistributionStatus(r.distribution_status)==="Submitted").length;
  $("commandArtist").textContent=summaries.filter(x=>x.data.workflowStatus==="Waiting on Artist").length;
  $("commandLabel").textContent=summaries.filter(x=>x.data.workflowStatus==="Waiting on Top Deck").length;
  $("commandReady").textContent=summaries.filter(x=>x.data.workflowStatus==="Ready for Distribution").length;
  $("commandWeek").textContent=releases.filter(r=>dateInCurrentWeek(r.release_date)).length;
  $("commandMonth").textContent=releases.filter(r=>normalizeDistributionStatus(r.distribution_status)==="Released"&&dateInCurrentMonth(r.release_date||r.updated_at)).length;

  const sorted=summaries.sort((a,b)=>a.data.score-b.data.score).slice(0,8);
  $("priorityActions").innerHTML=sorted.length?sorted.map(x=>`
    <div class="action-item"><div class="action-copy"><div class="priority-owner">${escapeHtml(x.owner)}</div><strong>${escapeHtml(x.action)}</strong><small>${escapeHtml(x.release.topdeck_release_id||"ID pending")} • ${x.data.score}% ready</small></div><button class="secondary" onclick="openReleaseWorkspace('${x.release.id}')">Open</button></div>`).join(""):'<div class="empty">No releases need attention.</div>';

  const counts=[
    ["Waiting on Artist",summaries.filter(x=>x.data.workflowStatus==="Waiting on Artist").length],
    ["Waiting on Top Deck",summaries.filter(x=>x.data.workflowStatus==="Waiting on Top Deck").length],
    ["Ready for Distribution",summaries.filter(x=>x.data.workflowStatus==="Ready for Distribution").length],
    ["Scheduled",releases.filter(r=>normalizeDistributionStatus(r.distribution_status)==="Scheduled").length]
  ];
  $("workflowSnapshot").innerHTML=counts.map(([label,count])=>`<div class="action-item"><div class="action-copy"><strong>${escapeHtml(label)}</strong><small>Current release count</small></div><strong>${count}</strong></div>`).join("");
}

function renderCatalog(){
  const query=$("catalogSearch").value.trim().toLowerCase();
  const workflow=$("catalogWorkflowFilter").value;
  const type=$("catalogTypeFilter").value;
  const filtered=releases.filter(r=>{
    const artist=artistForRelease(r); const data=readinessData(r);
    const haystack=[r.topdeck_release_id,r.title,r.release_type,r.distribution_status,data.workflowStatus,artist?.artist_name,artist?.legal_name].join(" ").toLowerCase();
    return (!query||haystack.includes(query))&&(workflow==="All"||data.workflowStatus===workflow)&&(type==="All"||(r.release_type||"Release")===type);
  });
  $("catalogBody").innerHTML=filtered.length?filtered.map(r=>{
    const artist=artistForRelease(r); const data=readinessData(r);
    return `<tr><td><strong>${escapeHtml(r.topdeck_release_id||"Pending")}</strong></td><td>${escapeHtml(artist?.artist_name||artist?.legal_name||"Unknown Artist")}</td><td>${escapeHtml(r.title||"Untitled Release")}</td><td>${escapeHtml(r.release_type||"Release")}</td><td>${escapeHtml(data.workflowStatus)}</td><td>${data.score}%</td><td>${escapeHtml(formatDate(r.release_date))}</td><td><span class="pill ${statusClass(r.distribution_status)}">${escapeHtml(normalizeDistributionStatus(r.distribution_status))}</span></td><td><button class="secondary" onclick="openReleaseWorkspace('${r.id}')">Open</button></td></tr>`;
  }).join(""):'<tr><td colspan="9"><div class="empty">No catalog records match this view.</div></td></tr>';
}

function renderArtists(){
  const query=$("artistSearch").value.trim().toLowerCase();
  const status=$("artistStatusFilter").value;

  const filtered=artists.filter(a=>{
    const haystack=[
      a.artist_name,a.legal_name,a.genre,a.location,a.contact_email,
      a.manager_name,a.manager_email,a.booking_email,a.artist_status,
      a.contract_status,a.crm_notes
    ].join(" ").toLowerCase();

    return (!query||haystack.includes(query)) &&
      (status==="All"||(a.artist_status||"Active")===status);
  });

  if(!filtered.length){
    $("artistGrid").innerHTML='<div class="empty">No artists match this view.</div>';
    return;
  }

  $("artistGrid").innerHTML=filtered.map(a=>`
    <article class="artist-card">
      <div class="artist-head">
        ${a.profile_image_url
          ? `<img class="artist-photo" src="${escapeHtml(a.profile_image_url)}" alt="${escapeHtml(a.artist_name||"Artist")}">`
          : `<div class="artist-photo placeholder">No Photo</div>`
        }
        <div>
          <h3>${escapeHtml(a.artist_name||"Unnamed Artist")}</h3>
          ${a.verified===true?'<div class="verified">✓ Verified Artist</div>':""}
          <div class="small">${escapeHtml(a.genre||"Genre not set")}</div>
          <div class="small">${escapeHtml(a.location||"Location not set")}</div>
        </div>
      </div>
      <div class="meta">
        Contract: ${escapeHtml(a.contract_status||"Unsigned")}<br>
        Status: ${escapeHtml(a.artist_status||"Active")}<br>
        Manager: ${escapeHtml(a.manager_name||"Not assigned")}<br>
        Releases: ${releases.filter(r=>r.user_id===a.user_id).length}
      </div>
      <span class="pill">${escapeHtml(a.contract_status||"Unsigned")}</span>
      <span class="pill">${escapeHtml(a.artist_status||"Active")}</span>
      <button class="primary" style="margin-top:14px;width:100%" onclick="openArtist('${a.user_id}')">View Profile</button>
    </article>
  `).join("");
}

function renderDistribution(){
  const query=$("releaseSearch").value.trim().toLowerCase();
  const status=$("distributionStatusFilter").value;
  const type=$("releaseTypeFilter").value;

  const filtered=releases.filter(r=>{
    const artist=artistForRelease(r);
    const distributionStatus=normalizeDistributionStatus(r.distribution_status);
    const haystack=[
      r.title,r.release_type,r.status,distributionStatus,r.admin_notes,
      artist?.artist_name,artist?.legal_name
    ].join(" ").toLowerCase();

    return (!query||haystack.includes(query)) &&
      (status==="All"||distributionStatus===status) &&
      (type==="All"||(r.release_type||"Release")===type);
  });

  if(!filtered.length){
    $("releaseGrid").innerHTML='<div class="empty">No releases match this distribution view.</div>';
    return;
  }

  $("releaseGrid").innerHTML=filtered.map(r=>{
    const artist=artistForRelease(r);
    const distributionStatus=normalizeDistributionStatus(r.distribution_status);
    const coverUrl=r.cover_url||r.cover_art_url||r.artwork_url||"";
    return `
      <article class="release-card">
        ${coverUrl
          ? `<img class="cover" src="${escapeHtml(coverUrl)}" alt="${escapeHtml(r.title||"Release")} artwork">`
          : `<div class="cover placeholder">No Artwork</div>`
        }
        <h3>${escapeHtml(r.title||"Untitled Release")}</h3>
        <div class="small">${escapeHtml(artist?.artist_name||"Unknown Artist")}</div>
        <div class="small">${escapeHtml(r.topdeck_release_id||"ID pending")} • ${escapeHtml(readinessData(r).workflowStatus)}</div>
        <div class="meta">
          Type: ${escapeHtml(r.release_type||"Release")}<br>
          Release date: ${escapeHtml(formatDate(r.release_date))}<br>
          Submitted: ${escapeHtml(formatDate(r.created_at))}
        </div>
        <span class="pill ${statusClass(distributionStatus)}">${escapeHtml(distributionStatus)}</span>
        <div class="readiness-mini">Readiness: ${readinessData(r).score}%</div>
        <div class="release-actions">
          <button class="primary" onclick="openReleaseWorkspace('${r.id}')">Open Workspace</button>
        </div>
      </article>
    `;
  }).join("");
}

window.openArtist=id=>{
  selectedArtistId=id;
  const artist=artists.find(a=>a.user_id===id);
  if(!artist)return;

  $("profileHeader").innerHTML=`
    <div class="artist-head" style="margin-bottom:16px">
      ${artist.profile_image_url
        ? `<img class="artist-photo" src="${escapeHtml(artist.profile_image_url)}" alt="${escapeHtml(artist.artist_name||"Artist")}">`
        : `<div class="artist-photo placeholder">No Photo</div>`
      }
      <div>
        <h2 style="margin:0">${escapeHtml(artist.artist_name||"Unnamed Artist")}</h2>
        <div class="small">${escapeHtml(artist.genre||"Genre not set")} • ${escapeHtml(artist.location||"Location not set")}</div>
      </div>
    </div>
  `;

  const values={
    artistName:artist.artist_name,legalName:artist.legal_name,genre:artist.genre,
    location:artist.location,contactEmail:artist.contact_email,phone:artist.phone,
    managerName:artist.manager_name,managerEmail:artist.manager_email,
    bookingEmail:artist.booking_email,websiteUrl:artist.website_url,
    instagramUrl:artist.instagram_url,spotifyUrl:artist.spotify_url,
    appleMusicUrl:artist.apple_music_url,youtubeUrl:artist.youtube_url,
    profileImageUrl:artist.profile_image_url,bio:artist.bio,crmNotes:artist.crm_notes
  };

  Object.entries(values).forEach(([id,value])=>$(id).value=value||"");
  $("artistStatus").value=artist.artist_status||"Active";
  $("contractStatus").value=artist.contract_status||"Unsigned";
  $("verified").value=artist.verified===true?"true":"false";

  renderArtistReleases(id);
  showView("profile");
  setNotice("profileStatus","Artist profile loaded.");
};

function renderArtistReleases(userId){
  const list=releases.filter(r=>r.user_id===userId);
  $("artistReleases").innerHTML=list.length?list.map(r=>`
    <div class="release">
      <strong>${escapeHtml(r.title||"Untitled Release")}</strong>
      <div class="small">${escapeHtml(r.release_type||"Release")} • ${escapeHtml(r.status||"Pending")}</div>
      <div class="small">ID: ${escapeHtml(r.topdeck_release_id||"Pending")}</div>
      <div class="small">Workflow: ${escapeHtml(readinessData(r).workflowStatus)}</div>
      <div class="small">Distribution: ${escapeHtml(normalizeDistributionStatus(r.distribution_status))}</div>
      <div class="small">Release date: ${escapeHtml(formatDate(r.release_date))}</div>
      <div class="small">Submitted: ${escapeHtml(formatDate(r.created_at))}</div>
    </div>
  `).join(""):'<div class="empty">No releases yet.</div>';
}

window.openReleaseWorkspace=id=>{
  selectedReleaseId=id;
  const release=releases.find(r=>String(r.id)===String(id));
  if(!release)return;

  const artist=artistForRelease(release);
  $("workspaceTitle").textContent=release.title||"Untitled Release";
  $("workspaceSubtitle").textContent=`${artist?.artist_name||"Unknown Artist"} • ${release.release_type||"Release"}`;
  $("workspaceReleaseId").textContent=release.topdeck_release_id||"Not assigned";
  $("workspaceDistributionStatus").value=normalizeDistributionStatus(release.distribution_status);
  $("workspaceReleaseDate").value=toDateInput(release.release_date);
  $("workspaceReleaseType").value=release.release_type||"Release";
  $("workspaceApprovalStatus").value=release.status||"Pending";
  $("workspaceISRCSource").value=release.isrc_source||"pending";
  $("workspaceISRC").value=release.isrc||"";
  $("workspaceUPCSource").value=release.upc_source||"pending";
  $("workspaceUPC").value=release.upc||"";
  $("workspacePublisher").value=release.publisher||"";
  $("workspaceCopyright").value=release.copyright_owner||"";
  $("workspaceMarketing").value=release.marketing_complete===true?"true":"false";
  $("workspaceCopyrightReview").value=release.copyright_review_complete===true?"true":"false";
  $("workspaceDistributionApproved").value=release.distribution_approved===true?"true":"false";
  $("workspaceAdminNotes").value=release.admin_notes||"";
  workspaceDirty=false;
  renderSaveState();

  const coverUrl=release.cover_url||release.cover_art_url||release.artwork_url||"";
  $("workspaceCoverWrap").outerHTML=coverUrl
    ? `<img id="workspaceCoverWrap" class="workspace-cover" src="${escapeHtml(coverUrl)}" alt="${escapeHtml(release.title||"Release")} artwork">`
    : `<div id="workspaceCoverWrap" class="cover placeholder">No Artwork</div>`;

  const audioUrl=release.audio_url||release.audio_file_url||release.song_url||"";
  const audio=$("workspaceAudio");
  if(audioUrl){
    audio.src=audioUrl;
    audio.classList.remove("hidden");
  }else{
    audio.removeAttribute("src");
    audio.load();
    audio.classList.add("hidden");
  }

  renderReadiness(release);
  setNotice("workspaceStatus","Release workspace loaded.");
  showView("workspace");
};

async function saveArtistProfile(){
  if(!selectedArtistId)return setNotice("profileStatus","Select an artist first.","error");

  const payload={
    user_id:selectedArtistId,
    artist_name:$("artistName").value.trim(),
    legal_name:$("legalName").value.trim(),
    genre:$("genre").value.trim(),
    location:$("location").value.trim(),
    contact_email:$("contactEmail").value.trim(),
    phone:$("phone").value.trim(),
    manager_name:$("managerName").value.trim(),
    manager_email:$("managerEmail").value.trim(),
    booking_email:$("bookingEmail").value.trim(),
    website_url:$("websiteUrl").value.trim(),
    instagram_url:$("instagramUrl").value.trim(),
    spotify_url:$("spotifyUrl").value.trim(),
    apple_music_url:$("appleMusicUrl").value.trim(),
    youtube_url:$("youtubeUrl").value.trim(),
    profile_image_url:$("profileImageUrl").value.trim(),
    artist_status:$("artistStatus").value,
    contract_status:$("contractStatus").value,
    verified:$("verified").value==="true",
    bio:$("bio").value.trim(),
    crm_notes:$("crmNotes").value.trim(),
    updated_at:new Date().toISOString()
  };

  setNotice("profileStatus","Saving artist profile...");

  const {error}=await client
    .from("artist_profiles")
    .upsert(payload,{onConflict:"user_id"});

  if(error)return setNotice("profileStatus",error.message,"error");

  setNotice("profileStatus","Artist profile saved.","success");
  await loadCRM();
  openArtist(selectedArtistId);
}

async function saveReleaseWorkspace(){
  if(!selectedReleaseId)return setNotice("workspaceStatus","Open a release first.","error");

  const release=releases.find(r=>String(r.id)===String(selectedReleaseId));
  if(!release)return setNotice("workspaceStatus","Release data is unavailable. Refresh and try again.","error");

  const formValues=workspaceOverrides();
  const validationErrors=validateCodeSelections(formValues);
  if(validationErrors.length){
    return setNotice("workspaceStatus",validationErrors.join(" "),"error");
  }
  const readiness=readinessData(release,formValues);
  const payload={
    ...formValues,
    workflow_status:readiness.workflowStatus,
    artist_completion:readiness.artistCompletion,
    label_completion:readiness.labelCompletion,
    admin_notes:$("workspaceAdminNotes").value.trim(),
    readiness_score:readiness.score,
    updated_at:new Date().toISOString()
  };

  setNotice("workspaceStatus","Saving distribution update...");

  const {error}=await client
    .from("release_submissions")
    .update(payload)
    .eq("id",selectedReleaseId);

  if(error)return setNotice("workspaceStatus",error.message,"error");

  workspaceDirty=false;
  renderSaveState();
  setNotice("workspaceStatus","Distribution update saved.","success");
  await loadCRM();
  openReleaseWorkspace(selectedReleaseId);
}


async function sendToDistribution(){
  if(!selectedReleaseId)return setNotice("workspaceStatus","Open a release first.","error");
  const release=releases.find(r=>String(r.id)===String(selectedReleaseId));
  if(!release)return setNotice("workspaceStatus","Release data is unavailable.","error");

  const formValues=workspaceOverrides();
  const readiness=readinessData(release,formValues);
  if(readiness.score!==100){
    return setNotice("workspaceStatus",`Release is not ready. Missing: ${readiness.missing.join(", ")}.`,"error");
  }

  if(!window.confirm(`Send ${release.title||"this release"} to distribution?`))return;
  $("workspaceDistributionStatus").value="Ready for Distribution";
  workspaceDirty=true;
  renderLiveReadiness();
  renderSaveState();
  setNotice("workspaceStatus","Marking release ready for distribution...");
  await saveReleaseWorkspace();
}

client.auth.onAuthStateChange(()=>verifyAdmin());
verifyAdmin();