const directionsService = new google.maps.DirectionsService();
const directionsRenderer = new google.maps.DirectionsRenderer();
let map;
let userMarker;
let startMarker;
let watchId;
let startLatLng;
let selectedMode = 'mylocation';
let hasStartedWalking = false;
let navigationSteps = [];

const messages = [
  "Weak sauce. I’ve sprinkled in extra miles—no excuses today.",
  "Oh come on, you can do better. Let’s bulk this up a bit.",
  "That’s cute. Added more miles so it’s *actually* a walk.",
  "Walking? Or just stepping outside? Time to step it up.",
  "LOL. I sneezed further than that. Added bonus miles!",
  "Nah, you’re not slacking today. Extra distance locked in.",
  "Boring! Boosted your route so it’s worth the effort.",
  "This isn’t a stroll in the park. Now it’s a *real* walk.",
  "Pathetic attempt. Added more—don’t whine 😈.",
  "Not impressed. Upped your walk, thank me later.",
  "You call that a challenge? Pushed it up a notch.",
  "Lazy much? Giving you a little shove forward.",
  "Hah! That distance was a joke. Let’s get serious.",
  "Sleepwalking? Added extra to wake you up.",
  "I’m your personal trainer now. No shortcuts 💪.",
  "You’re better than this. Here’s more to prove it.",
  "Shortcut? Not today. Extra miles coming in hot.",
  "Lame route detected. Added a twist for you.",
  "Trying to cheat the system? Nope. Extra distance added.",
  "Did you mean nap? Added more miles to your route."
];

function initMap() {
  const defaultLocation = { lat: 51.505, lng: -0.09 }; // Default center
  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultLocation,
    zoom: 13,
  });
}

window.onload = initMap;

function handleLocationChoice() {
  const choice = document.getElementById("locationChoice").value;
  selectedMode = choice;

  if (choice === 'postcode') {
    openPostcodeModal();
  }
}

function openPostcodeModal() {
  document.getElementById("postcodeModal").style.display = "block";
}

function closePostcodeModal() {
  document.getElementById("postcodeModal").style.display = "none";
}

function submitPostcode() {
  const postcode = document.getElementById("postcode").value;
  if (!postcode) {
    alert("Please enter a postcode.");
    return;
  }
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: postcode }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const lat = results[0].geometry.location.lat();
      const lng = results[0].geometry.location.lng();
      startLatLng = { lat, lng };

      if (startMarker) {
        startMarker.setPosition(results[0].geometry.location);
      } else {
        startMarker = new google.maps.Marker({
          position: results[0].geometry.location,
          map: map,
          title: "Start Point",
        });
      }

      map.setCenter(results[0].geometry.location);
      closePostcodeModal();
    } else {
      alert("Could not find that postcode. Please try again.");
    }
  });
}

function getBoostPercentage(distance) {
  if (distance < 0.1) return 0; // special case
  if (distance <= 1) return Math.random() * (2.0 - 1.0) + 1.0; // 100% to 200%
  if (distance <= 3) return Math.random() * (0.5 - 0.3) + 0.3; // 30% to 50%
  if (distance <= 10) return Math.random() * (0.25 - 0.15) + 0.15; // 15% to 25%
  if (distance <= 20) return Math.random() * (0.15 - 0.1) + 0.1; // 10% to 15%
  if (distance <= 50) return Math.random() * (0.1 - 0.05) + 0.05; // 5% to 10%
  return 0; // >50 skip challenge
}

function getRoute() {
  const distanceInput = parseFloat(document.getElementById("distance").value);
  const unit = document.getElementById("unitSelector").value;

  if (!distanceInput || distanceInput <= 0) {
    alert("Please enter a valid distance.");
    return;
  }

  if (distanceInput > 50) {
    proceedWithRoute(distanceInput, unit);
    return;
  }

  if (distanceInput < 0.1) {
    showChallenge(1, unit, "👀 That’s barely a stretch! I’m setting you up with a proper 1-mile walk.");
    return;
  }

  if (Math.random() < 0.5) {
    const boostPercent = getBoostPercentage(distanceInput);
    const extra = (distanceInput * boostPercent).toFixed(2);
    const newDistance = (parseFloat(distanceInput) + parseFloat(extra)).toFixed(2);
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    const pace = unit === 'miles' ? 20 : 12; // est mins per mile/km
    const extraMins = Math.round(extra * pace);

    showChallenge(newDistance, unit, `${randomMessage}<br><br>New total: ${newDistance} ${unit}.<br><em>PS: It'll only add about ${extraMins} minutes to your walk—might as well crush it!</em>`);
  } else {
    proceedWithRoute(distanceInput, unit);
  }
}

function showChallenge(newDistance, unit, message) {
  document.getElementById("challengeText").innerHTML = message;
  document.getElementById("challengeNote").textContent = '';
  document.getElementById("challengeModal").style.display = "block";

  document.getElementById("acceptChallenge").onclick = () => {
    document.getElementById("challengeModal").style.display = "none";
    proceedWithRoute(parseFloat(newDistance), unit); // ✅ FIXED: force number
  };

  document.getElementById("declineChallenge").onclick = () => {
    document.getElementById("challengeModal").style.display = "none";
    proceedWithRoute(parseFloat(document.getElementById("distance").value), unit);
  };
}

function declineChallenge() {
  document.getElementById("challengeModal").style.display = "none";
  proceedWithRoute(parseFloat(document.getElementById("distance").value), document.getElementById("unitSelector").value);
}

function proceedWithRoute(distance, unit) {
  if (selectedMode === 'mylocation') {
    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      startLatLng = { lat, lng };
      buildRoute(lat, lng, distance, unit);
    }, () => {
      alert("Could not get your location.");
    });
  } else if (selectedMode === 'postcode') {
    if (!startLatLng) {
      alert("Please set your starting point first.");
      return;
    }
    buildRoute(startLatLng.lat, startLatLng.lng, distance, unit);
  }
}

function buildRoute(lat, lng, distance, unit) {
  hasStartedWalking = false;

  directionsRenderer.setMap(null);
  directionsRenderer.setOptions({
    map: map,
    suppressMarkers: true
  });

  let distanceInKm = parseFloat(distance);
  if (unit === 'miles') {
    distanceInKm *= 1.60934;
  }

  const waypoints = [];
  const numPoints = 6;
  const radiusInKm = distanceInKm / (2 * Math.PI);

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const dx = radiusInKm * Math.cos(angle);
    const dy = radiusInKm * Math.sin(angle);
    const pointLat = lat + (dy / 111);
    const pointLng = lng + (dx / (111 * Math.cos(lat * Math.PI / 180)));
    waypoints.push({ location: { lat: pointLat, lng: pointLng }, stopover: true });
  }

  const request = {
    origin: { lat, lng },
    destination: { lat, lng },
    travelMode: 'WALKING',
    waypoints,
    optimizeWaypoints: false,
  };

  directionsService.route(request, (result, status) => {
    if (status === 'OK') {
      directionsRenderer.setDirections(result);
      document.getElementById("startNavigation").style.display = "inline-block";
      updateRouteInfo(result.routes[0].legs[0]);
      showNavigationSteps(result.routes[0].legs[0].steps);
    } else {
      alert("Could not generate route.");
    }
  });
}

function updateRouteInfo(leg) {
  document.getElementById("routeDistance").textContent = `Distance: ${leg.distance.text}`;
  document.getElementById("routeTime").textContent = `Estimated Time: ${leg.duration.text}`;
}

function showNavigationSteps(steps) {
  navigationSteps = steps;
  const list = document.getElementById("stepsList");
  list.innerHTML = "";
  steps.forEach((step, i) => {
    const li = document.createElement("li");
    li.innerHTML = step.instructions;
    li.id = `step-${i}`;
    list.appendChild(li);
  });
}

function startNavigation() {
  if (!map || !startLatLng) {
    alert("Please generate a route first!");
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
      map.setCenter(pos);

      if (!userMarker) {
        userMarker = new google.maps.Marker({
          position: pos,
          map: map,
          title: "You are here",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#00F",
            fillOpacity: 0.8,
            strokeWeight: 2,
            strokeColor: "#fff"
          }
        });
      } else {
        userMarker.setPosition(pos);
      }

      const distToStart = getDistanceFromLatLonInMeters(pos.lat, pos.lng, startLatLng.lat, startLatLng.lng);
      if (!hasStartedWalking && distToStart > 50) hasStartedWalking = true;

      if (hasStartedWalking && distToStart < 20) {
        alert("Congrats! You've completed your route 🎉");
        stopNavigation();
      }

      highlightCurrentStep(pos);
    },
    () => alert("Error tracking your location."),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
  );

  document.getElementById("startNavigation").disabled = true;
  document.getElementById("stopNavigation").style.display = "inline-block";
}

function highlightCurrentStep(userPos) {
  let closestIdx = -1;
  let closestDist = Infinity;

  navigationSteps.forEach((step, i) => {
    const lat = step.start_location.lat();
    const lng = step.start_location.lng();
    const dist = getDistanceFromLatLonInMeters(userPos.lat, userPos.lng, lat, lng);

    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  });

  if (closestIdx !== -1) {
    navigationSteps.forEach((_, i) => {
      const el = document.getElementById(`step-${i}`);
      if (el) el.style.backgroundColor = i === closestIdx ? "#c1eaff" : "";
    });
  }
}

function stopNavigation() {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    alert("Navigation stopped.");
    document.getElementById("startNavigation").disabled = false;
    document.getElementById("stopNavigation").style.display = "none";
  }
}

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
