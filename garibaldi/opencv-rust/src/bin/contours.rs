use std::path::PathBuf;

use opencv::{core, imgcodecs, imgproc, prelude::*, types, Result};

fn detect_contours(src_path: PathBuf, contours_path: PathBuf) -> Result<()> {
    let src = imgcodecs::imread(src_path.to_str().unwrap(), imgcodecs::IMREAD_GRAYSCALE)?;
    let mut src_bw = unsafe { Mat::new_size(src.size()?, core::CV_32S)? };
    imgproc::threshold(&src, &mut src_bw, 128.0, 255.0, imgproc::THRESH_BINARY)?;

    let mut contours = types::VectorOfMat::new();
    let offset = core::Point::default();
    imgproc::find_contours(
        &src_bw,
        &mut contours,
        imgproc::RETR_EXTERNAL,
        imgproc::CHAIN_APPROX_SIMPLE,
        offset,
    )?;

    let mut contour_image = unsafe { Mat::new_size(src.size()?, core::CV_32S)? };

    let contour_index = -1; // draw all
    let color = core::Scalar::new(128.0, 128.0, 128.0, 128.0);
    let thickness = 1;
    let linetype = 4;
    let hierarchy = core::Mat::default()?;
    let max_level = 0;
    imgproc::draw_contours(
        &mut contour_image,
        &contours,
        contour_index,
        color,
        thickness,
        linetype,
        &hierarchy,
        max_level,
        offset,
    )?;

    let params = opencv::types::VectorOfint::new();
    imgcodecs::imwrite(contours_path.to_str().unwrap(), &contour_image, &params)?;

    Ok(())
}

fn main() {
    let src_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("greyscale.png");
    let contours_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("contours.png");

    println!("{:?}", detect_contours(src_path, contours_path));
}