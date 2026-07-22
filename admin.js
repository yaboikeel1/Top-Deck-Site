let data={
  "settings": {
    "siteName": "Top Deck Music Group",
    "tagline": "From the mud to motion. From the booth to the world.",
    "bookingEmail": "booking@topdeckmusicgroup.com",
    "cities": [
      "Plain Dealing",
      "Bossier City",
      "Shreveport"
    ],
    "socials": {
      "instagram": "",
      "youtube": "",
      "tiktok": "",
      "facebook": ""
    }
  },
  "artists": [
    {
      "name": "KeelG",
      "slug": "keelg",
      "bio": "Artist. Motivator. Creative visionary. Built from the mud with real-life stories and motion.",
      "image": "",
      "featured": true,
      "links": {
        "spotify": "",
        "appleMusic": "",
        "youtube": "",
        "instagram": ""
      }
    },
    {
      "name": "All Ace's",
      "slug": "all-aces",
      "bio": "Original voice, family roots, and real-life energy.",
      "image": "",
      "featured": true,
      "links": {
        "spotify": "",
        "appleMusic": "",
        "youtube": "",
        "instagram": ""
      }
    },
    {
      "name": "D-Money",
      "slug": "d-money",
      "bio": "Street sound, hustle energy, and collaboration power.",
      "image": "",
      "featured": true,
      "links": {
        "spotify": "",
        "appleMusic": "",
        "youtube": "",
        "instagram": ""
      }
    }
  ],
  "releases": [
    {
      "title": "New Release",
      "artist": "KeelG",
      "type": "Single",
      "cover": "",
      "status": "Coming Soon",
      "date": "",
      "links": {
        "spotify": "",
        "appleMusic": "",
        "youtube": "",
        "audiomack": ""
      }
    },
    {
      "title": "Top Deck Rotation",
      "artist": "Various Artists",
      "type": "Playlist",
      "cover": "",
      "status": "Live",
      "date": "",
      "links": {
        "spotify": "",
        "appleMusic": "",
        "youtube": "",
        "audiomack": ""
      }
    }
  ],
  "radio": {
    "stationName": "Top Deck Radio",
    "status": "Offline",
    "nowPlaying": "Top Deck Radio Live",
    "tagline": "Live rotation. Real voices. Independent energy.",
    "streamUrl": "",
    "embedUrl": "",
    "shows": [
      {
        "name": "Top Deck Rotation",
        "time": "Fridays",
        "description": "Independent music, street stories, interviews, and fresh drops."
      },
      {
        "name": "Artist Spotlight",
        "time": "Coming Soon",
        "description": "A dedicated lane for new releases, interviews, and new talent."
      }
    ]
  },
  "merch": [
    {
      "id": "td-logo-tee",
      "name": "Top Deck Logo Tee",
      "description": "Official Top Deck Music Group logo tee.",
      "price": 30.0,
      "currency": "usd",
      "status": "Coming Soon",
      "image": "",
      "sizes": [
        "S",
        "M",
        "L",
        "XL",
        "2XL",
        "3XL"
      ],
      "stripePriceId": "price_replace_with_stripe_id"
    },
    {
      "id": "td-hoodie",
      "name": "Top Deck Hoodie",
      "description": "Heavyweight hoodie for the movement.",
      "price": 55.0,
      "currency": "usd",
      "status": "Coming Soon",
      "image": "",
      "sizes": [
        "S",
        "M",
        "L",
        "XL",
        "2XL",
        "3XL"
      ],
      "stripePriceId": "price_replace_with_stripe_id"
    },
    {
      "id": "td-radio-tee",
      "name": "Top Deck Radio Tee",
      "description": "Top Deck Radio official tee.",
      "price": 30.0,
      "currency": "usd",
      "status": "Coming Soon",
      "image": "",
      "sizes": [
        "S",
        "M",
        "L",
        "XL",
        "2XL",
        "3XL"
      ],
      "stripePriceId": "price_replace_with_stripe_id"
    }
  ],
  "news": [
    {
      "title": "Welcome to Top Deck Music Group",
      "category": "Announcement",
      "date": "2026-06-25",
      "excerpt": "The official home for music, radio, visuals, merch, and the Top Deck movement."
    }
  ]
};const $=id=>document.getElementById(id);function bind(){ $("siteName").value=data.settings.siteName;$("tagline").value=data.settings.tagline;$("bookingEmail").value=data.settings.bookingEmail;$("cities").value=data.settings.cities.join(", ");$("jsonOutput").value=JSON.stringify(data,null,2)}$("saveBtn").onclick=()=>{try{data=JSON.parse($("jsonOutput").value)}catch(e){}data.settings.siteName=$("siteName").value;data.settings.tagline=$("tagline").value;data.settings.bookingEmail=$("bookingEmail").value;data.settings.cities=$("cities").value.split(",").map(x=>x.trim()).filter(Boolean);bind()};$("downloadBtn").onclick=()=>{const blob=new Blob([$("jsonOutput").value],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="site-data.json";a.click();URL.revokeObjectURL(url)};bind();