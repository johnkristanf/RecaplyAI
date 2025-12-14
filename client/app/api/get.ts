import axios from "axios";

export async function fetchRecordings() {
    const response = await axios.get(
      "http://localhost:8000/api/v1/recordings/get/all"
    );
    console.log("response.data: ", response.data);
    
    return response.data || [];
  }
  