const $ = id => document.getElementById(id);
const client = window.supabase.createClient(
  window.TOPDECK_SUPABASE_URL,
  window.TOPDECK_SUPABASE_ANON_KEY
);

let artists = [];
let releases = [];
let selectedArtistId = null;
let selectedReleaseId = null;

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

$("artistsTab").onclick=()=>showView("artists");
$("profileTab").onclick=()=>showView("profile");
$("distributionTab").onclick=()=>showView("distribution");
$("workspaceTab").onclick=()=>showView("workspace");
$("backToDistributionBtn").onclick=()=>showView("distribution");
$("refreshBtn").onclick=loadCRM;
$("distributionRefreshBtn").onclick=loadCRM;
$("artistSearch").oninput=renderArtists;
$("artistStatusFilter").onchange=renderArtists;
$("releaseSearch").oninput=renderDistribution;
$("distributionStatusFilter").onchange=renderDistribution;
$("releaseTypeFilter").onchange=renderDistribution;
$("saveProfileBtn").onclick=saveArtistProfile;
$("saveWorkspaceBtn").onclick=saveReleaseWorkspace;
$("sendDistributionBtn").onclick=sendToDistribution;
["workspaceDistributionStatus","workspaceReleaseDate","workspaceISRC","workspaceUPC","workspacePublisher","workspaceCopyright","workspaceMarketing"]
  .forEach(id=>$(id).addEventListener("input",renderLiveReadiness));


const READINESS_ITEMS = [
  {key:"artwork",label:"Cover Artwork",weight:12},
  {key:"audio",label:"Audio Uploaded",weight:12},
  {key:"title",label:"Song Title",weight:8},
  {key:"artist",label:"Artist Linked",weight:8},
  {key:"releaseDate",label:"Release Date",weight:10},
  {key:"distributionStatus",label:"Distribution Status",weight:10},
  {key:"isrc",label:"ISRC",weight:10},
  {key:"upc",label:"UPC",weight:10},
  {key:"publisher",label:"Publisher",weight:5},
  {key:"copyright",label:"Copyright Owner",weight:5},
  {key:"marketing",label:"Marketing Assets",weight:10}
];

function readinessData(release,overrides={}){
  const artist=artistForRelease(release);
  const values={
    artwork:Boolean(release.cover_url||release.cover_art_url||release.artwork_url),
    audio:Boolean(release.audio_url||release.audio_file_url||release.song_url),
    title:Boolean(String(release.title||"").trim()),
    artist:Boolean(artist?.artist_name||artist?.legal_name),
    releaseDate:Boolean(overrides.release_date??release.release_date),
    distributionStatus:Boolean(overrides.distribution_status??release.distribution_status),
    isrc:Boolean(String(overrides.isrc??release.isrc??"").trim()),
    upc:Boolean(String(overrides.upc??release.upc??"").trim()),
    publisher:Boolean(String(overrides.publisher??release.publisher??"").trim()),
    copyright:Boolean(String(overrides.copyright_owner??release.copyright_owner??"").trim()),
    marketing:Boolean(overrides.marketing_complete??release.marketing_complete)
  };
  const score=READINESS_ITEMS.reduce((sum,item)=>sum+(values[item.key]?item.weight:0),0);
  return {values,score,missing:READINESS_ITEMS.filter(item=>!values[item.key]).map(item=>item.label)};
}

function workspaceOverrides(){
  return {
    distribution_status:$("workspaceDistributionStatus").value,
    release_date:$("workspaceReleaseDate").value||null,
    isrc:$("workspaceISRC").value.trim(),
    upc:$("workspaceUPC").value.trim(),
    publisher:$("workspacePublisher").value.trim(),
    copyright_owner:$("workspaceCopyright").value.trim(),
    marketing_complete:$("workspaceMarketing").value==="true"
  };
}

function renderReadiness(release,overrides={}){
  const result=readinessData(release,overrides);
  $("workspaceReadinessScore").textContent=`${result.score}%`;
  $("workspaceReadinessFill").style.width=`${result.score}%`;
  $("workspaceReadinessFill").parentElement.setAttribute("aria-label",`${result.score}% release readiness`);

  let state="🔴 Needs Work";
  if(result.score===100)state="🟢 Ready for Distribution";
  else if(result.score>=75)state="🟡 Almost Ready";
  else if(result.score>=50)state="🟠 In Progress";
  $("workspaceReadinessState").textContent=result.missing.length?`${state} • Missing: ${result.missing.join(", ")}`:state;

  $("workspaceChecklist").innerHTML=READINESS_ITEMS.map(item=>`
    <div class="check-item ${result.values[item.key]?"complete":""}">
      <span class="check-icon">${result.values[item.key]?"✓":"○"}</span>
      <span>${escapeHtml(item.label)} <small>(${item.weight}%)</small></span>
    </div>`).join("");

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
    artists:"artistsView",
    profile:"profileView",
    distribution:"distributionView",
    workspace:"workspaceView"
  };
  Object.entries(views).forEach(([name,id])=>{
    $(id).classList.toggle("hidden",name!==view);
  });

  const tabs={
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

  renderArtists();
  renderDistribution();

  setNotice("crmStatus","Roster loaded.","success");
  setNotice("distributionStatus","Distribution queue loaded.","success");
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
  $("workspaceDistributionStatus").value=normalizeDistributionStatus(release.distribution_status);
  $("workspaceReleaseDate").value=toDateInput(release.release_date);
  $("workspaceReleaseType").value=release.release_type||"Release";
  $("workspaceApprovalStatus").value=release.status||"Pending";
  $("workspaceISRC").value=release.isrc||"";
  $("workspaceUPC").value=release.upc||"";
  $("workspacePublisher").value=release.publisher||"";
  $("workspaceCopyright").value=release.copyright_owner||"";
  $("workspaceMarketing").value=release.marketing_complete===true?"true":"false";
  $("workspaceAdminNotes").value=release.admin_notes||"";

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
  const readiness=readinessData(release,formValues);
  const payload={
    ...formValues,
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

  $("workspaceDistributionStatus").value="Ready for Distribution";
  renderLiveReadiness();
  setNotice("workspaceStatus","Marking release ready for distribution...");
  await saveReleaseWorkspace();
}

client.auth.onAuthStateChange(()=>verifyAdmin());
verifyAdmin();