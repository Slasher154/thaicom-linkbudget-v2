/**
 * Created by thana on 12/6/2016.
 */

//import '/imports/api/utils/maplabel-compiled';
import { Satellites } from '/imports/api/satellites/satellites';
import { Transponders } from '/imports/api/transponders/transponders';
import { htsTransponderSorter } from '/imports/api/utils/sort-functions';


Template.findContours.viewmodel({
    onCreated(){
        Meteor.subscribe('allThaicomSatellites');
        Meteor.subscribe('allTranspondersWithBasicInfo');
    },
    onRendered(){
      $('#multipleCsv').val('100.2139,9.133\n98.345,-0.445\n92.1344,1.334');
      $('#excelInput').val('100.2139\t9.133\n98.345\t-0.445\n92.1344\t1.334');
    },
    mapData: {
        geojsonData: { "type": "FeatureCollection",
            "features": [
                { "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [[77.08, 5.09],[118.78, 4.47], [116.72, 24.52], [76.81, 24.24],[77.08, 5.09]]
                        ]
                    },
                    "properties": {
                        "strokeWeight": 0,
                    }
                }
            ]
        },
    },
    mapHeight: '700px',
    satellites() {
        return Satellites.find().fetch().map((satellite) => {
            return {
                id: satellite.name,
                name: satellite.name,
            };
        });
    },
    satelliteChanged(event){
        //$('.select-picker').selectpicker();
        let $transponderPicker = $('#transponder-picker');
        $transponderPicker.find($('option')).remove();
        if (this.selectedSatellite()) {
            let attributeToShow = '';
            let transponders = Transponders.find({
                satellite: this.selectedSatellite(),
            }).fetch();
            if (this.isConventional()) {
                attributeToShow = 'beam';
                // Change select specific transponder to true
                this.findSpecificTransponder(true);
            } else {
                attributeToShow = 'path';
                transponders = transponders.sort(htsTransponderSorter);
            }

            let options =  transponders.map((tp) => {
                return `<option value="${tp._id}">${tp.name} (${tp[attributeToShow]})</option>`;
            });
            $transponderPicker.append(options).selectpicker('refresh');

        }
    },
    selectedSatellite: '',
    selectedValueToDisplay: '',
    coordinates: '',
    isConventional() {
        if (this.selectedSatellite()) {
            let satelliteType = Satellites.findOne({name: this.selectedSatellite()}).type;
            return satelliteType.toLowerCase() === 'Conventional'.toLowerCase()
        }
        return false;
    },
    forceSpecificTransponder() {
        return this.isConventional();
    },
    findSpecificTransponder: true,
    transponders() {
        if (this.selectedSatellite()) {
            let attributeToShow = '';
            if (this.isConventional()) {
                attributeToShow = 'beam';
            } else {
                attributeToShow = 'path';
            }
            return Transponders.find({
                satellite: this.selectedSatellite()
            }).fetch().map((tp) => {
                return {
                    id: tp._id,
                    name: `${tp.name} (${tp[attributeToShow]})`
                };
            });
        }
        return [];

    },
    selectedTransponder: '',
    valueText() {
        if (this.isConventional()) {
            let value = this.selectedValueToDisplay();
            if (value.toLowerCase() === 'eirp') return 'EIRP (dBW)';
            else return 'G/T (dB/K)';
        }
        return 'Relative Contour (dB)';
    },
    resultShown: false,
    resultContours: [],
    showBestBeamOnly: true,
    toggleShowBestBeamOnlyText() {
        if(this.showBestBeamOnly()){
            return 'Show all beams';
        }
        return 'Show best beam only';
    },
    toggleShowBestBeamOnly(event) {
        event.preventDefault();
        this.showBestBeamOnly(!this.showBestBeamOnly());
        renderResultTable(this.resultContours(), this.showBestBeamOnly());
    },
    coordsSubmitted(event) {
        event.preventDefault();
        let self = this;

        let satellite = self.selectedSatellite();
        let parameter = self.selectedValueToDisplay();
        let coords = convertCoordsTableToObject(self.coordinates());



        if (!satellite) {
            Bert.alert('Please select a satellite', 'danger', 'fixed-top');
            return false;
        }
        if (!parameter) {
            Bert.alert('Please select either EIRP or G/T', 'danger', 'fixed-top');
            return false;
        }

        if (!coords) {
            Bert.alert('Please put coordinates in the correct format', 'danger', 'fixed-top');
            return false;
        }

        let options = {
            satellite: satellite,
            parameter: parameter,
            coordinates: coords,
        };

        let transponders = [];
        if (self.findSpecificTransponder()) {
            let transponderIds = $('#transponder-picker').val();
            if (!transponderIds) {
                Bert.alert('Please select at least 1 transponder', 'danger', 'fixed-top');
                return false;
            }
            transponders = transponderIds.map((tpId) => {
                return Transponders.findOne({ _id: tpId });
            });
            let names = _.uniq(_.pluck(transponders, 'name'));
            let paths = _.uniq(_.pluck(transponders, 'path'));

            // Find the forward and return beam at the same time is not allowed
            if (paths > 1) {
                Bert.alert('Cannot find the forward and return beam at the same time', 'danger', 'fixed-top');
                return false;
            } else {
                options.names = names;
                options.path = paths[0];
            }
        }
        $('.loading').text('Searching for contours... This might takes time especially when no transponder is specified.');
        Meteor.call('findContoursValueFromCoordinates', options, (error, result) => {
            if (error) {
                Bert.alert(error.reason, 'danger', 'fixed-top');
            }
            else {
                $('.map-container').empty();
                //console.log(JSON.stringify(result));

                // Attach results to this template
                self.resultContours(result.resultContours);

                Blaze.renderWithData(Template.geojsonPreview, {
                    mapData: {
                        geojsonData: result.resultPolygons,
                        beamLabels: result.beamLabels,
                    },
                    mapHeight: self.mapHeight(),
                }, $('.map-container')[0]);

                renderResultTable(self.resultContours(), self.showBestBeamOnly());
            }

            $('.loading').text('');
            self.resultShown(true);
        });

        function convertCoordsTableToObject(coords) {
            console.log(coords);
            let rows = coords.split('\n');
            console.log('rows = ' + rows);
            let formattedcoords = [];

            // Remove the last row if it is blank. This happens when paste from excel and the cursor enter a new line
            if (rows[rows.length-1].length == 0) {
                rows.pop();
            }
            rows.forEach((row) => {
                let columns = row.split('\t');

                let lat = -200, lon = -200;

                // If columns after split = 1, check if it's valid coordinates in the form of longitude,latitude
                if (columns.length == 1) {
                    let splitString = columns[0].split(',');
                    if (splitString.length < 2) {
                        return false;
                    }
                    lon = columns[0].split(',')[0];
                    lat = columns[0].split(',')[1];
                }

                else if (columns.length != 2) {
                    return false;
                }
                else {
                    // 1st column = longitude
                    lon = columns[0];

                    // 2nd column = latitude
                    lat = columns[1];
                }
                let coordsLine = {};

                if (isNaN(lon) || lon <= -180 || lon >= 180) {
                    Bert.alert('Longitude is not correct', 'danger', 'fixed-top');
                    return false;
                }
                // Convert longitude to number by preceding with + sign
                coordsLine.longitude = +lon;



                if (isNaN(lat) || lat <= -90 || lat >= 90) {
                    Bert.alert('Latitude is not correct', 'danger', 'fixed-top');
                    return false;
                }
                // Convert latitude to number by preceding with + sign
                coordsLine.latitude = +lat;

                formattedcoords.push(coordsLine);
            });
            return formattedcoords;
        }
    },

});

function renderResultTable(resultContours, showBestBeamOnly) {
    // If it's show best beam only mode, group result by locations and show only the one with lowest value (relative contour)
    // or highest (EIRP, G/T)

    let $tbody = $('#results').find('tbody').empty();
    let tableHtml = '';
    let count = 1;
    resultContours.forEach((contour) => {
        //console.log('Row: ' + count + ' ' + 'Show best beam only = ' + showBestBeamOnly);
        if (!showBestBeamOnly || (showBestBeamOnly && contour.isBestBeam)) {
            tableHtml += '<tr>';
            tableHtml += `<td>${count++}</td>`;
            tableHtml += `<td>${contour.longitude}</td>`;
            tableHtml += `<td>${contour.latitude}</td>`;
            tableHtml += `<td>${contour.bestBeam}</td>`;
            tableHtml += `<td>${contour.value}</td>`;
            tableHtml += '</tr>';
        }
    });
    $tbody.append(tableHtml);
}