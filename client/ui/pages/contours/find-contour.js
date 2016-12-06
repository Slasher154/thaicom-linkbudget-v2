/**
 * Created by thana on 12/6/2016.
 */

Template.findContours.viewmodel({
    displayedContour() {
        return {
            "type": "FeatureCollection",
            "features": []
        }
    },
    satellites: [
        { id: 'Thaicom 4', name: 'Thaicom 4' },
        { id: 'Thaicom 5', name: 'Thaicom 5' },
        { id: 'Thaicom 6', name: 'Thaicom 6' },
    ],
    selectedSatellite: '',
    selectedValueToDisplay: '',
    selectedValueType: '',
    coordinates: '',
    coordsSubmitted(event) {
        event.preventDefault();

        let satellite = this.selectedSatellite();
        let parameter = this.selectedValueToDisplay();
        let valueType = this.selectedValueType();
        let coords = convertCoordsTableToObject(this.coordinates());

        if (!satellite) {
            Bert.alert('Please select a satellite', 'danger', 'fixed-top');
        }
        else if (!parameter) {
            Bert.alert('Please select either EIRP or G/T', 'danger', 'fixed-top');
        }
        else if (!valueType) {
            Bert.alert('Please select either absolute value or relative from peak value', 'danger', 'fixed-top');
        }
        else if (!coords) {
            Bert.alert('Please put coordinates in the correct format', 'danger', 'fixed-top');
        }

        else {
            let options = {
                satellite: satellite,
                parameter: parameter,
                valueType: valueType,
                coordinates: coords,
            };
            Meteor.call('findContoursValueFromCoordinates', options, (error, result) => {
                if (error) {
                    Bert.alert(error.reason, 'danger', 'fixed-top');
                }
                else {
                    $('.map-container').empty();
                    Blaze.renderWithData(Template.geojsonPreview, {
                        geojsonData: result.resultPolygons,
                    }, $('.map-container')[0]);

                    let $tbody = $('#results').find('tbody').empty();

                    // Append results to table
                    let tableHtml = '';
                    result.resultContours.forEach((contour, index) => {
                        tableHtml += '<tr>';
                        tableHtml += `<td>${index+1}</td>`;
                        tableHtml += `<td>${contour.latitude}</td>`;
                        tableHtml += `<td>${contour.longitude}</td>`;
                        tableHtml += `<td>${contour.bestBeam}</td>`;
                        tableHtml += `<td>${contour.value}</td>`;
                        tableHtml += '</tr>';
                    });
                    $tbody.append(tableHtml);
                }
            });

        }

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

                if (columns.length != 2) {
                    return false;
                }
                let coordsLine = {};

                // 1st column = latitude
                let lat = columns[0];
                if (isNaN(lat) || lat <= -90 || lat >= 90) {
                    Bert.alert('Latitude is not correct', 'danger', 'fixed-top');
                    return false;
                }
                // Convert latitude to number by preceding with + sign
                coordsLine.latitude = +lat;

                // 2nd column = longitude
                let lon = columns[1];
                if (isNaN(lon) || lon <= -180 || lon >= 180) {
                    Bert.alert('Longitude is not correct', 'danger', 'fixed-top');
                    return false;
                }
                // Convert longitude to number by preceding with + sign
                coordsLine.longitude = +lon;

                formattedcoords.push(coordsLine);
            });
            return formattedcoords;
        }
    },
});