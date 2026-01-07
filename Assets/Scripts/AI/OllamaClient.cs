using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using Cristal.CLI.Core;

namespace Cristal.CLI.AI
{
    /// <summary>
    /// HTTP client for Ollama API running Qwen 8B locally.
    /// Handles connection, requests, and response parsing.
    /// </summary>
    public class OllamaClient : MonoBehaviour
    {
        // Legacy singleton - use ServiceLocator.Get<OllamaClient>() instead
        [Obsolete("Use ServiceLocator.Get<OllamaClient>() instead")]
        public static OllamaClient Instance { get; private set; }

        [Header("Ollama Settings")]
        [SerializeField] private string _baseUrl = "http://localhost:11434";
        [SerializeField] private string _model = "qwen3:8b";
        [SerializeField] private float _timeout = 60f;
        [SerializeField] private bool _stream = false;

        [Header("Generation Parameters")]
        [SerializeField] private float _temperature = 0.8f;
        [SerializeField] private int _maxTokens = 256;
        [SerializeField] private float _topP = 0.9f;

        // Events
        public event Action<string> OnResponseReceived;
        public event Action<string> OnError;
        public event Action OnRequestStarted;
        public event Action OnRequestCompleted;

        private bool _isRequestPending = false;
        private Coroutine _currentRequest;

        public bool IsRequestPending => _isRequestPending;
        public string BaseUrl => _baseUrl;
        public string Model => _model;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                ServiceLocator.RegisterMono(this);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        /// <summary>
        /// Set the base URL for Ollama API.
        /// </summary>
        public void SetBaseUrl(string url)
        {
            _baseUrl = url.TrimEnd('/');
        }

        /// <summary>
        /// Set the model to use.
        /// </summary>
        public void SetModel(string model)
        {
            _model = model;
        }

        /// <summary>
        /// Generate a response from Qwen.
        /// </summary>
        public void Generate(string prompt, Action<string> onSuccess, Action<string> onError = null)
        {
            if (_isRequestPending)
            {
                onError?.Invoke("Request already pending");
                return;
            }

            _currentRequest = StartCoroutine(GenerateCoroutine(prompt, onSuccess, onError));
        }

        /// <summary>
        /// Generate a response and return via coroutine yield.
        /// </summary>
        public IEnumerator GenerateAsync(string prompt, Action<string> onSuccess, Action<string> onError = null)
        {
            yield return GenerateCoroutine(prompt, onSuccess, onError);
        }

        private IEnumerator GenerateCoroutine(string prompt, Action<string> onSuccess, Action<string> onError)
        {
            _isRequestPending = true;
            OnRequestStarted?.Invoke();

            string url = $"{_baseUrl}/api/generate";

            // Build request body
            var requestBody = new OllamaGenerateRequest
            {
                model = _model,
                prompt = prompt,
                stream = _stream,
                options = new OllamaOptions
                {
                    temperature = _temperature,
                    num_predict = _maxTokens,
                    top_p = _topP
                }
            };

            string jsonBody = JsonUtility.ToJson(requestBody);
            Debug.Log($"[OllamaClient] Request to {url}");
            Debug.Log($"[OllamaClient] Prompt length: {prompt.Length} chars");

            using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                request.timeout = (int)_timeout;

                yield return request.SendWebRequest();

                _isRequestPending = false;
                OnRequestCompleted?.Invoke();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    try
                    {
                        string responseJson = request.downloadHandler.text;
                        var response = JsonUtility.FromJson<OllamaGenerateResponse>(responseJson);

                        if (!string.IsNullOrEmpty(response.response))
                        {
                            string cleanedResponse = CleanResponse(response.response);
                            Debug.Log($"[OllamaClient] Response received: {cleanedResponse.Length} chars");
                            OnResponseReceived?.Invoke(cleanedResponse);
                            onSuccess?.Invoke(cleanedResponse);
                        }
                        else
                        {
                            string error = "Empty response from Qwen";
                            Debug.LogWarning($"[OllamaClient] {error}");
                            OnError?.Invoke(error);
                            onError?.Invoke(error);
                        }
                    }
                    catch (Exception e)
                    {
                        string error = $"Parse error: {e.Message}";
                        Debug.LogError($"[OllamaClient] {error}");
                        OnError?.Invoke(error);
                        onError?.Invoke(error);
                    }
                }
                else
                {
                    string error = $"Request failed: {request.error}";
                    Debug.LogError($"[OllamaClient] {error}");
                    OnError?.Invoke(error);
                    onError?.Invoke(error);
                }
            }
        }

        /// <summary>
        /// Clean and format the AI response.
        /// </summary>
        private string CleanResponse(string response)
        {
            // Remove any leading/trailing whitespace
            response = response.Trim();

            // Remove common AI prefixes
            string[] prefixesToRemove = {
                "CRISTAL:",
                "Response:",
                "AI:",
                "Assistant:",
                "Here is my response:",
                "Here's my response:"
            };

            foreach (string prefix in prefixesToRemove)
            {
                if (response.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    response = response.Substring(prefix.Length).Trim();
                }
            }

            return response;
        }

        /// <summary>
        /// Check if Ollama is available.
        /// </summary>
        public void CheckConnection(Action<bool> callback)
        {
            StartCoroutine(CheckConnectionCoroutine(callback));
        }

        private IEnumerator CheckConnectionCoroutine(Action<bool> callback)
        {
            string url = $"{_baseUrl}/api/tags";

            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                request.timeout = 5;
                yield return request.SendWebRequest();

                bool isConnected = request.result == UnityWebRequest.Result.Success;
                Debug.Log($"[OllamaClient] Connection check: {(isConnected ? "OK" : "FAILED")}");
                callback?.Invoke(isConnected);
            }
        }

        /// <summary>
        /// Cancel the current request if pending.
        /// </summary>
        public void CancelRequest()
        {
            if (_currentRequest != null)
            {
                StopCoroutine(_currentRequest);
                _currentRequest = null;
                _isRequestPending = false;
                Debug.Log("[OllamaClient] Request cancelled");
            }
        }

        /// <summary>
        /// Get available models from Ollama.
        /// </summary>
        public void GetModels(Action<string[]> callback)
        {
            StartCoroutine(GetModelsCoroutine(callback));
        }

        private IEnumerator GetModelsCoroutine(Action<string[]> callback)
        {
            string url = $"{_baseUrl}/api/tags";

            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                request.timeout = 10;
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    try
                    {
                        var response = JsonUtility.FromJson<OllamaTagsResponse>(request.downloadHandler.text);
                        string[] modelNames = new string[response.models.Length];
                        for (int i = 0; i < response.models.Length; i++)
                        {
                            modelNames[i] = response.models[i].name;
                        }
                        callback?.Invoke(modelNames);
                    }
                    catch
                    {
                        callback?.Invoke(new string[0]);
                    }
                }
                else
                {
                    callback?.Invoke(new string[0]);
                }
            }
        }
    }

    #region Ollama API Data Structures

    [Serializable]
    public class OllamaGenerateRequest
    {
        public string model;
        public string prompt;
        public bool stream;
        public OllamaOptions options;
    }

    [Serializable]
    public class OllamaOptions
    {
        public float temperature;
        public int num_predict;
        public float top_p;
    }

    [Serializable]
    public class OllamaGenerateResponse
    {
        public string model;
        public string created_at;
        public string response;
        public bool done;
        public int[] context;
        public long total_duration;
        public long load_duration;
        public int prompt_eval_count;
        public long prompt_eval_duration;
        public int eval_count;
        public long eval_duration;
    }

    [Serializable]
    public class OllamaTagsResponse
    {
        public OllamaModel[] models;
    }

    [Serializable]
    public class OllamaModel
    {
        public string name;
        public string modified_at;
        public long size;
    }

    #endregion
}
