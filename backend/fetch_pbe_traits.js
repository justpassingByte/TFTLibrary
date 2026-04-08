fetch('https://raw.communitydragon.org/pbe/cdragon/tft/en_us.json')
  .then(r=>r.json())
  .then(d => {
    const traits = d.sets['17']?.traits?.slice(0, 3);
    console.log(JSON.stringify(traits, null, 2));
  }).catch(e=>console.log(e));
