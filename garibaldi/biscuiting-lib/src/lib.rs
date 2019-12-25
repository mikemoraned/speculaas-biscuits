extern crate base64;
extern crate console_error_panic_hook;
extern crate image;
extern crate js_sys;
extern crate wasm_bindgen;
#[cfg(feature = "wee_alloc")]
extern crate wee_alloc;

use wasm_bindgen::prelude::*;
use wasm_bindgen::Clamped;

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
pub struct BiscuitFinder {
    output: Option<Vec<u8>>,
    color_map: Option<Vec<Rgba<u8>>>,
}

use image::{Rgba, RgbaImage};

fn gen_range(min: u8, max: u8) -> u8 {
    let random = js_sys::Math::random();
    return ((random * ((max - min + 1) as f64)).floor() as u8) + min;
}

fn random_color_map(num_labels: usize) -> Vec<Rgba<u8>> {
    use web_sys::console;

    let mut color_map = vec![Rgba([0u8; 4]); num_labels];
    color_map[0] = Rgba([0u8; 4]);
    for label in 1..num_labels {
        color_map[label] = Rgba([
            gen_range(1, 255),
            gen_range(1, 255),
            gen_range(1, 255),
            255u8,
        ]);
    }
    console::log_1(&format!("color map: {:?}", color_map).into());

    color_map
}

#[wasm_bindgen]
impl BiscuitFinder {
    pub fn new() -> BiscuitFinder {
        console_error_panic_hook::set_once();
        BiscuitFinder {
            output: None,
            color_map: Some(random_color_map(100)),
        }
    }

    pub fn find_biscuits(
        &mut self,
        width: u32,
        height: u32,
        input: Clamped<Vec<u8>>,
    ) -> Result<String, JsValue> {
        use image::{GrayImage, Luma};
        use imageproc::map::map_colors;
        use imageproc::region_labelling::{connected_components, Connectivity};
        use web_sys::console;

        let input_background_color = Rgba([255u8; 4]);

        console::time_with_label("from raw input");
        match RgbaImage::from_raw(width, height, input.0) {
            Some(image) => {
                console::time_end_with_label("from raw input");

                let foreground_color = Luma([255u8; 1]);
                let background_color = Luma([0u8; 1]);

                console::time_with_label("process image");
                let gray_image: GrayImage = map_colors(&image, |p| {
                    if p == input_background_color {
                        background_color
                    } else {
                        foreground_color
                    }
                });

                let labelled_image =
                    connected_components(&gray_image, Connectivity::Four, background_color);
                let num_labels = (labelled_image.pixels().map(|p| p[0]).max().unwrap()) as usize;
                let required_color_map_size = num_labels + 1;
                let color_map = self.stretch_color_map(required_color_map_size);
                let processed_gray_image =
                    map_colors(&labelled_image, |p| color_map[p[0] as usize]);

                console::time_end_with_label("process image");

                console::time_with_label("to raw output");
                self.output = Some(processed_gray_image.to_vec());
                console::time_end_with_label("to raw output");
                return Ok("processed image".into());
            }
            None => {
                return Err("couldn't read from raw".into());
            }
        }
    }

    fn stretch_color_map(&mut self, required_color_map_size: usize) -> &Vec<Rgba<u8>> {
        match &self.color_map {
            Some(map) => {
                if map.len() <= required_color_map_size {
                    self.color_map = Some(random_color_map(required_color_map_size));
                }
            }
            None => {
                self.color_map = Some(random_color_map(required_color_map_size));
            }
        };
        self.color_map.as_ref().unwrap()
    }

    pub fn output(&self) -> *const u8 {
        match &self.output {
            Some(buffer) => buffer.as_ptr(),
            None => panic!("no output"),
        }
    }
}
