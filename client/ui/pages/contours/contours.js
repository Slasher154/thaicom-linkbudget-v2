/**
 * Created by thana on 9/15/2016.
 */

import { mapColors } from '/imports/api/maps/maps.js';


Template.contours.viewmodel({
    onRendered(){
    },
    displayedContour() {
        return {
            "type": "FeatureCollection",
            "features": [{
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [100.514112, 13.859462],
                },
            }],
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
    contours: '',
    contourColors: [],
    contourSubmitted(event) {
        event.preventDefault();
        
        let self = this;
        let satellite = self.selectedSatellite();
        let parameter = self.selectedValueToDisplay();
        let valueType = self.selectedValueType();
        let contours = convertContoursTableToObject(self.contours());

        if (!satellite) {
            Bert.alert('Please select a satellite', 'danger', 'fixed-top');
        }
        else if (!parameter) {
            Bert.alert('Please select either EIRP or G/T', 'danger', 'fixed-top');
        }
        else if (!valueType) {
            Bert.alert('Please select either absolute value or relative from peak value', 'danger', 'fixed-top');
        }
        else if (!contours) {
            Bert.alert('Please put contours in the correct format', 'danger', 'fixed-top');
        }

        else {
            let options = {
                satellite: satellite,
                parameter: parameter,
                valueType: valueType,
                contours: contours,
            };
            Meteor.call('findContoursToPlot', options, (error, result) => {
                if (error) {
                    Bert.alert(error.reason, 'danger', 'fixed-top');
                }
                else {
                    self.mapData({
                        geojsonData: result.resultContour,
                        beamLabels: result.beamLabels,
                    });
                    self.applyFormatting();
                    self.renderMap();
                    if(result.notFoundMessages && result.notFoundMessages.length > 0) {
                        self.logMessages(result.notFoundMessages);
                    } else {
                        self.logMessages([]);
                    }
                }
            });

        }

        function convertContoursTableToObject(contours) {

            let rows = contours.split('\n');
            let formattedContours = [];

            // Remove the last row if it is blank. This happens when paste from excel and the cursor enter a new line
            if (rows[rows.length-1].length == 0) {
                rows.pop();
            }
            rows.forEach((row) => {
                let columns = row.split('\t');

                if (columns.length < 2 || columns.length > 3) {
                    return false;
                }
                let contourLine = {};

                // 1st column = beam name
                if (!columns[0]) return false;
                contourLine.name = columns[0];

                // 2nd column = path (fwd, rtn) for HTS, = value for conventional
                if (columns.length == 3) { // HTS
                    let path = columns[1].toLowerCase();
                    if(_.contains(['forward','fwd'], path)) {
                        path = 'forward';
                    }
                    else if (_.contains(['return', 'rtn'], path)) {
                        path = 'return';
                    }
                    else return false;
                    contourLine.path = path;

                    let value = columns[2];
                    if(isNaN(value)) {
                        return false;
                    }
                    contourLine.value = +value;
                }

                // 2nd column = path (fwd, rtn) for HTS, = value for conventional
                if (columns.length == 2) { // Conventional
                    let value = columns[1];
                    if(isNaN(value)) {
                        return false;
                    }
                    contourLine.value = +value;
                }
                formattedContours.push(contourLine);
            });
            return formattedContours;
        }
    },
    logMessages: [],
    mapData:{
            geojsonData: {
                "type": "FeatureCollection",
                "features": [{
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [100.514112, 13.859462],
                    },
                }],
            }
    },
    showLabel: true,
    showLabelChanged() {
        this.applyFormatting();
        this.renderMap();
    },
    labelFontSize: 12,
    increaseLabelFontSize(event) {
        event.preventDefault();
        let currentLabelFontSize = this.labelFontSize();
        console.log('Current = ' + currentLabelFontSize);
        this.labelFontSize(currentLabelFontSize + 2);
        console.log('New = ' + this.labelFontSize());
        this.applyFormatting();
        this.renderMap();
    },
    decreaseLabelFontSize(event) {
        event.preventDefault();
        let currentLabelFontSize = this.labelFontSize();
        if (currentLabelFontSize >= 1) {
            this.labelFontSize(currentLabelFontSize - 2);
        }
        this.applyFormatting();
        this.renderMap();
    },
    strokeWeight: 1,
    increaseStrokeWeight(event) {
        event.preventDefault();
        let currentWeight = this.strokeWeight();
        this.strokeWeight(currentWeight + 1);
        this.applyFormatting();
        this.renderMap();
    },
    decreaseStrokeWeight(event) {
        event.preventDefault();
        let currentWeight = this.strokeWeight();
        // The stroke weight cannot be less than zero
        if (currentWeight >= 0) {
            this.strokeWeight(currentWeight - 1);
        }
        this.applyFormatting();
        this.renderMap();
    },
    showChangeColorButton: false,
    initialColors() {
        return mapColors.map((color, index) => {
            return {
                index: index + 1,
                color, color,
            };
        });
    },
    colorChanged(event) {
        event.preventDefault();
        let colors = [];
        // Loop through the color picker table
        $('.colorPicker input').each((index, item) => {
            console.log(item.value);
            colors.push({
                index: index,
                color: item.value,
            })
        });

        this.contourColors(colors);
        this.applyFormatting();
        this.renderMap();
    },
    applyFormatting() { // Apply the formatting set in this page to map data

        // Labels Visibility and Font Size
        this.mapData().beamLabels.forEach((label) => {
            label.visible = this.showLabel();
            label.fontSize = this.labelFontSize();
        });

        let distinctCategories = [];
        let colorChoices = this.contourColors().length == 0 ? this.initialColors() : this.contourColors();

        this.mapData().geojsonData.features.forEach((feature) => {
            let geometry = feature.geometry;
            // Only apply formatting on Polygon objects
            if(geometry.type === 'Polygon') {
                // Set stroke weight with the current stroke weight value
                feature.properties.strokeWeight = this.strokeWeight();

                // Assign color based on categories
                let category = feature.properties.category;

                if (category) {
                    // if this category did not appear in the previous contour lines (new one), push it into array
                    if (distinctCategories.indexOf(category) < 0) {
                        distinctCategories.push(category);
                    }

                    // In some case where the current color array has lesser elements than category, change to initial colors
                    if (distinctCategories.length > colorChoices.length) {
                        colorChoices = this.initialColors();
                    }

                    // Select the color based on the index of category. For example, if there is category "A" and "B",
                    // Contours in category "A" will get the first color in the mapColors array and all lines in category "B"
                    // will get the 2nd color in the array.
                    feature.properties.color = colorChoices[distinctCategories.indexOf(category)].color;
                }
            }
        });
        // Reduce the color choices array to make it equal to the number of categories and set it to contourColors array
        // This is to set the contourColors array for the first time when the number of categories are unknown
        this.contourColors(colorChoices.slice(0, distinctCategories.length));
        this.renderPickerColor();
        //console.log(JSON.stringify(this.mapData()));
    },
    renderPickerColor(){
        $('.colorPickerContainer').empty();
        Blaze.renderWithData(Template.colorPickers, {
            contourColors: this.contourColors(),
        } , $('.colorPickerContainer')[0]);
    },
    renderMap() {
        $('.map-container').empty();
        Blaze.renderWithData(Template.geojsonPreview, {
            mapData: this.mapData(),
        } , $('.map-container')[0]);
    }
});

Template.colorPickers.viewmodel({
    onRendered() {
        $('.colorPicker').colorpicker().on('changeColor', function (e) {
            // Simulate the change color button in parent template (contour template) click to trigger color change
            console.log('clicked');
            $('.change-color').click();
        });
    },
});