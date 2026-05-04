import {
  AfterViewInit,
  Component,
  OnDestroy,
} from '@angular/core';

import * as L from 'leaflet';
import * as toGeoJSON from '@tmcw/togeojson';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../../firebase';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [],
  templateUrl: './tracking.html',
  styleUrl: './tracking.scss',
})
export class Tracking implements AfterViewInit, OnDestroy {
  private map?: L.Map;
  private runnerMarker?: L.Marker;
  private firebaseUnsubscribe?: Unsubscribe;

  private trackPoints: L.LatLng[] = [];

  ngAfterViewInit(): void {
    this.initMap();
    this.loadGpx();
  }

  ngOnDestroy(): void {
    this.firebaseUnsubscribe?.();
    this.map?.remove();
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [45.9237, 6.8694],
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);
  }

  private async loadGpx(): Promise<void> {
    if (!this.map) return;

    try {
      const response = await fetch('/TPN2026.gpx');

      if (!response.ok) {
        throw new Error(`Erreur GPX : ${response.status}`);
      }

      const gpxText = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(gpxText, 'text/xml');
      const geojson = toGeoJSON.gpx(xml);

      let firstPoint: L.LatLng | null = null;
      let lastPoint: L.LatLng | null = null;

      const gpxLayer = L.geoJSON(geojson, {
        filter: (feature) => {
          const type = feature.geometry?.type;
          const name = feature.properties?.['name']?.toLowerCase() || '';

          return (
            type === 'LineString' ||
            type === 'MultiLineString' ||
            (type === 'Point' && name.includes('ravito'))
          );
        },

        style: (feature) => {
          const type = feature?.geometry?.type;

          if (type === 'LineString' || type === 'MultiLineString') {
            return {
              color: 'red',
              weight: 4,
            };
          }

          return {};
        },

        pointToLayer: (feature, latlng) => {
          const name = feature.properties?.['name'] || 'Ravito';

          return L.circleMarker(latlng, {
            radius: 7,
            color: 'blue',
            fillColor: 'blue',
            fillOpacity: 0.9,
            weight: 2,
          }).bindPopup(`<strong>${name}</strong>`);
        },

        onEachFeature: (feature) => {
          const type = feature?.geometry?.type;

          if (type === 'LineString') {
            const coords = feature.geometry.coordinates;

            coords.forEach((coord: number[]) => {
              this.trackPoints.push(L.latLng(coord[1], coord[0]));
            });

            if (coords.length > 0) {
              const first = coords[0];
              const last = coords[coords.length - 1];

              firstPoint = L.latLng(first[1], first[0]);
              lastPoint = L.latLng(last[1], last[0]);
            }
          }

          if (type === 'MultiLineString') {
            const multiCoords = feature.geometry.coordinates;

            multiCoords.forEach((line: number[][]) => {
              line.forEach((coord: number[]) => {
                this.trackPoints.push(L.latLng(coord[1], coord[0]));
              });
            });

            const firstLine = multiCoords[0];
            const lastLine = multiCoords[multiCoords.length - 1];

            if (firstLine?.length && lastLine?.length) {
              const first = firstLine[0];
              const last = lastLine[lastLine.length - 1];

              firstPoint = L.latLng(first[1], first[0]);
              lastPoint = L.latLng(last[1], last[0]);
            }
          }
        },
      }).addTo(this.map);

      if (firstPoint) {
        L.marker(firstPoint, {
          icon: L.divIcon({
            html: '🏁',
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        })
          .addTo(this.map)
          .bindPopup('<strong>Départ</strong>');
      }

      if (lastPoint) {
        L.marker(lastPoint, {
          icon: L.divIcon({
            html: '🏁',
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        })
          .addTo(this.map)
          .bindPopup('<strong>Arrivée</strong>');
      }

      const bounds = gpxLayer.getBounds();

      if (bounds.isValid()) {
        this.map.fitBounds(bounds, {
          padding: [30, 30],
        });
      }

      this.startFirebaseTracking();
    } catch (error) {
      console.error('Erreur chargement GPX:', error);
    }
  }

  private startFirebaseTracking(): void {
    if (!this.map) return;

    const courseRef = doc(db, 'courses', 'TPN');

    this.firebaseUnsubscribe = onSnapshot(courseRef, (snapshot) => {
      const data = snapshot.data();

      if (!data) return;

      const lat = data['lat'];
      const lng = data['lng'];

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        console.error('Position Firebase invalide:', data);
        return;
      }

      const position: L.LatLngExpression = [lat, lng];

      if (!this.runnerMarker) {
        this.runnerMarker = L.marker(position, {
          icon: L.divIcon({
            html: '🏃',
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        })
          .addTo(this.map!)
          .bindPopup('Dernière position connue');
      } else {
        this.runnerMarker.setLatLng(position);
      }
    });
  }
}