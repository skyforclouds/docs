application {
  name        = "GPU Job Processor"
  summary     = "A GPU-accelerated job processing backend"
  description = "This service fetches jobs from a queue, processes them using the GPU, stores results, and repeats."
  tags        = ["gpu", "job-processing", "backend", "example"]

  daemon {
    name = "gpu-job-processor"

    config {
      image = "echo-server:latest"
    }

    resources {
      cpu_mhz          = 1024
      memory_mib       = 1024
      sharing_strategy = "mps"
      device {
        name = "nvidia/gpu"
        memory_mibs = [1024]
      }
    }

    # endpoint - only required if the daemon needs to be accessible via HTTP. If not specified, the daemon will run in the background without an HTTP endpoint.
    endpoint api {
        port = 8080 # container port
        health {
            type = "http"
            path = "/"
            interval = "30s"
            timeout = "5s"
        }
    }

    env {
      # Example: JOB_QUEUE_URL, RESULT_STORE_URL, etc.
      # JOB_QUEUE_URL    = "amqp://my-queue"
      # RESULT_STORE_URL = "s3://my-bucket/results"
    }
  }
}