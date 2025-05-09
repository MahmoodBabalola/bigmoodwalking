const directionsService = new google.maps.DirectionsService();
const directionsRenderer = new google.maps.DirectionsRenderer();

function getRoute() {
  const distance = document.getElementById("distance").value;
  navigator.geolocation.getCurrentPosition((position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    initMap(lat, lng);

    const circle = new google.maps.Circle({
      strokeColor: "#FF0000",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#FF0000",
      fillOpacity: 0.15,
      map,
      center: { lat, lng },
      radius: distance * 1000,
    });

    // Draw a simple loop walk (for demo)
    const request = {
      origin: { lat, lng },
      destination: { lat, lng },
      travelMode: 'WALKING',
      waypoints: [
        {
          location: {
            lat: lat + 0.01,
            lng: lng + 0.01,
          },
          stopover: true,
        },
      ],
    };
    directionsRenderer.setMap(map);
    directionsService.route(request, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
      }
    });
  });
}
