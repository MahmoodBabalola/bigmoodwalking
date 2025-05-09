const directionsService = new google.maps.DirectionsService();
const directionsRenderer = new google.maps.DirectionsRenderer();
let map;

function initMap(lat, lng) {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat, lng },
    zoom: 14,
  });
}

function getRoute() {
  const distance = document.getElementById("distance").value;
  if (!distance || distance <= 0) {
    alert("Please enter a valid distance in km.");
    return;
  }

  navigator.geolocation.getCurrentPosition((position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    initMap(lat, lng);

    // Draw the radius circle for reference
    new google.maps.Circle({
      strokeColor: "#FF0000",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#FF0000",
      fillOpacity: 0.15,
      map,
      center: { lat, lng },
      radius: distance * 500, // radius is half of the total loop distance
    });

    // Generate dynamic waypoints around the circle
    const waypoints = [];
    const numPoints = 6; // You can adjust for smoother/rougher loops
    const radiusInKm = (distance / (2 * Math.PI)); // radius to achieve total loop distance

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const dx = radiusInKm * Math.cos(angle);
      const dy = radiusInKm * Math.sin(angle);

      // Approximate lat/lng offset conversion
      const pointLat = lat + (dy / 111); // 1 degree lat ~ 111 km
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
      optimizeWaypoints: false, // Keeps the circle shape as you defined
    };

    directionsRenderer.setMap(map);
    directionsService.route(request, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
      } else {
        console.error("Directions request failed due to: " + status);
        alert("Could not find a route. Try a smaller distance or different location.");
      }
    });
  }, (error) => {
    console.error("Geolocation error: ", error);
    alert("Could not get your location. Please allow location access.");
  });
}
