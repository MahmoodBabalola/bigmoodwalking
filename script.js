const directionsService = new google.maps.DirectionsService();
const directionsRenderer = new google.maps.DirectionsRenderer();
let map;
let userMarker;
let startMarker; // For pin drop
let watchId;
let startLatLng; // Starting point
let selectedMode = 'mylocation';
let mapClickListener;
let hasStartedWalking = false;
let navigationSteps = []; // Step-by-step instructions

function initMap() {
  const defaultLocation = { lat: 51.505, lng: -0.09 }; // Default center

  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultLocation,
    zoom: 13,
  });
}

window.onload = initMap;

function handleLocationChoice() {
  selectedMode = document.getElementById("locationChoice").value;

  if (selectedMode === 'postcode') {
    openPostcodeModal();
  }

  if (selectedMode === 'pin') {
    alert("Click on the map to set your starting point.");
    if (mapClickListener) {
      google.maps.event.removeListener(mapClickListener);
    }
    mapClickListener = map.addListener("click", (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      if (startMarker) {
        startMarker.setPosition(e.latLng);
      } else {
        startMarker = new google.maps.Marker({
          position: e.latLng,
          map: map,
          title: "Start Point",
        });
      }
      startLatLng = { lat, lng };
    });
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

function getRoute() {
  const distance = document.getElementById("distance").value;
  if (!distance || distance <= 0) {
    alert("Please enter a valid distance in km.");
    return;
  }

  if (selectedMode === 'mylocation') {
    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      startLatLng = { lat, lng };
      buildRoute(lat, lng, distance);
    }, (error) => {
      console.error("Geolocation error: ", error);
      alert("Could not get your location. Please allow location access.");
    });
  } else if (selectedMode === 'postcode' || selectedMode === 'pin') {
    if (!startLatLng) {
      alert("Please set your starting point first (postcode or pin).");
      return;
    }
    buildRoute(startLatLng.lat, startLatLng.lng, distance);
  }
}

function buildRoute(lat, lng, distance) {
  // Reset walking status
  hasStartedWalking = false;

  // Clear existing route
  directionsRenderer.setMap(null);
  directionsRenderer.setMap(map);

  new google.maps.Circle({
    strokeColor: "#FF0000",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#FF0000",
    fillOpacity: 0.15,
    map,
    center: { lat, lng },
    radius: distance * 500,
  });

  const waypoints = [];
  const numPoints = 6;
  const radiusInKm = (distance / (2 * Math.PI));

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const dx = radiusInKm * Math.cos(angle);
    const dy = radiusInKm * Math.sin(angle);

    const pointLat = lat + (dy / 111);
    const pointLng = lng + (dx / (111 * Math.cos(lat * (Math.PI / 180))));

    waypoints.push({
      location: { lat: pointLat, lng: pointLng },
      stopover: true,
    });
  }

  const request = {
    origin: { lat, lng },
    destination: { lat, lng },
    travelMode: 'WALKING',
    waypoints: waypoints,
    optimizeWaypoints: false,
  };

  directionsService.route(request, (result, status) => {
    if (status === 'OK') {
      directionsRenderer.setDirections(result);
      document.getElementById("startNavigation").style.display = "inline-block";

      // Extract and show steps
      const steps = result.routes[0].legs[0].steps;
      showNavigationSteps(steps);
    } else {
      console.error("Directions request failed: " + status);
      alert("Could not generate route. Try a different distance or location.");
    }
  });
}

function showNavigationSteps(steps) {
  navigationSteps = steps;

  const container = document.getElementById("instructions");
  if (!container) {
    const div = document.createElement("div");
    div.id = "instructions";
    div.style.marginTop = "20px";
    div.innerHTML = "<h3>Steps:</h3><ol id='stepsList'></ol>";
    document.body.appendChild(div);
  }

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
      const currentLat = position.coords.latitude;
      const currentLng = position.coords.longitude;
      const pos = { lat: currentLat, lng: currentLng };

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

      const distanceToStart = getDistanceFromLatLonInMeters(currentLat, currentLng, startLatLng.lat, startLatLng.lng);
      if (!hasStartedWalking && distanceToStart > 50) {
        hasStartedWalking = true;
      }

      if (hasStartedWalking && distanceToStart < 20) {
        alert("Congrats! You've completed your route 🎉");
        stopNavigation();
      }

      // Highlight current step
      highlightCurrentStep(pos);
    },
    (error) => {
      console.error("Tracking error: ", error);
      alert("Error tracking your location.");
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000
    }
  );

  document.getElementById("startNavigation").disabled = true;
  document.getElementById("stopNavigation").style.display = "inline-block";
}

function highlightCurrentStep(userPos) {
  let closestStepIndex = -1;
  let closestDistance = Infinity;

  navigationSteps.forEach((step, i) => {
    const lat = step.start_location.lat();
    const lng = step.start_location.lng();
    const dist = getDistanceFromLatLonInMeters(userPos.lat, userPos.lng, lat, lng);

    if (dist < closestDistance) {
      closestDistance = dist;
      closestStepIndex = i;
    }
  });

  if (closestStepIndex !== -1) {
    navigationSteps.forEach((_, i) => {
      const el = document.getElementById(`step-${i}`);
      if (el) el.style.backgroundColor = i === closestStepIndex ? "#c1eaff" : "";
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

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
