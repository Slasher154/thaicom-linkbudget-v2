/**
 * Created by thana on 10/7/2016.
 */

export const readJsonFromAssetFiles = (filePath) => {
    return JSON.parse((Assets.getText(filePath)));
}