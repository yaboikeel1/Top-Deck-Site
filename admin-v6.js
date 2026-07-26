const $ = id => document.getElementById(id);
const client = window.supabase.createClient(
  window.TOPDECK_SUPABASE_URL,
  window.TOPDECK_SUPABASE_ANON_KEY
);

let artists = [];
let releases = [];
let selectedArtistId = null;

function setNotice(id,message,type=""){
  const el=$(id);
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
$("refreshBtn").onclick=loadCRM;
$("artistSearch").oninput=renderArtists;
$("artistStatusFilter").onchange=renderArtists;
$("saveProfileBtn").onclick=saveArtistProfile;

function showView(view){
  $("artistsView").classList.toggle("hidden",view!=="artists");
  $("profileView").classList.toggle("hidden",view!=="profile");
  $("artistsTab").classList.toggle("active",view==="artists");
  $("profileTab").classList.toggle("active",view==="profile");
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

  const [artistsResult,releasesResult]=await Promise.all([
    client.from("artist_profiles").select("*").order("artist_name",{ascending:true}),
    client.from("release_submissions").select("*").order("created_at",{ascending:false})
  ]);

  if(artistsResult.error)return setNotice("crmStatus",artistsResult.error.message,"error");
  if(releasesResult.error)return setNotice("crmStatus",releasesResult.error.message,"error");

  artists=artistsResult.data||[];
  releases=releasesResult.data||[];

  $("artistCount").textContent=artists.length;
  $("activeCount").textContent=artists.filter(a=>(a.artist_status||"Active")==="Active").length;
  $("verifiedCount").textContent=artists.filter(a=>a.verified===true).length;
  $("signedCount").textContent=artists.filter(a=>a.contract_status==="Signed").length;
  $("releaseCount").textContent=releases.length;

  renderArtists();
  setNotice("crmStatus","Roster loaded.","success");
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
      <strong>${escapeHtml(r.title)}</strong>
      <div class="small">${escapeHtml(r.release_type||"Release")} • ${escapeHtml(r.status||"Pending")}</div>
      <div class="small">Release date: ${escapeHtml(formatDate(r.release_date))}</div>
      <div class="small">Submitted: ${escapeHtml(formatDate(r.created_at))}</div>
    </div>
  `).join(""):'<div class="empty">No releases yet.</div>';
}

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

client.auth.onAuthStateChange(()=>verifyAdmin());
verifyAdmin();
