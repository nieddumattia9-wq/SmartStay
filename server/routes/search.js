const express = require("express");

const router = express.Router();

const {
  searchDestinations,
} = require("../services/stayService");

router.post(
  "/search-destinations",
  async (req, res) => {
    try {

      const { query } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: "Missing search query.",
        });
      }

      const results =
        await searchDestinations(query);

      res.json(results);

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message: "Unable to search destinations.",
      });

    }
  }
);

module.exports = router;