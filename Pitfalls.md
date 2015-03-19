# R<sup>5</sup>RS Pitfalls Test Results #

| **1.1** | **1.2** | **1.3** | **2.1** | **3.1** | **3.2** | **3.3** | **4.1** | **4.2** | **4.3** | **5.1** | **5.2** | **5.3** | **6.1** | **7.1** | **7.2** | **7.3** | **7.4** | **8.1** | **8.2** |
|:--------|:--------|:--------|:--------|:--------|:--------|:--------|:--------|:--------|:--------|:--------|:--------|:--------|:--------|:--------|:--------|:--------|:--------|:--------|:--------|
| **F** | **F** | **P** | **P** | _?_ | _?_ | _?_ | **P** | **P** | **P** | **P** | **P** | **P** | _?_ | _?_ | _?_ | _?_ | _?_ | _?_ | **P** |

### Key ###

  * **F**  -  Fail
  * **P**  -  Pass
  * _?_  -  Not tested

## Tests that Pass ##

  * **1.3**
```
>  ;; 1.3, Should be: #t
.. (letrec ((x (call-with-current-continuation
..              (lambda (c)
..                (list #T c)))))
..   (if (car x)
..       ((car (cdr x)) (list #F (lambda () x)))
..       (eq? x ((car (cdr x))))))
;Value: #t   
```
  * **2.1**
```
>  ;; 2.1, Should be: 1
.. (call-with-current-continuation
..  (lambda (c)
..    (0 (c 1))))
;Value: 1
```
  * **4.1**
```
>  ;; 4.1, Should be: (x)
.. ((lambda lambda lambda) 'x)
;Value: (x)
```
  * **4.2**
```
>  ;; 4.2, Should be: (1 2 3)
.. ((lambda (begin) (begin 1 2 3)) (lambda lambda lambda))
;Value: (1 2 3)
```
  * **4.3**
```
>  ;; 4.3, Should be: #f
.. (let ((quote -)) (eqv? '1 1))
;Value: #f
```
  * **5.1**
```
>  ;; 5.1, Should be: #f
.. (eq? #f '())
;Value: #f
```
  * **5.2**
```
>  ;; 5.2, Should be: #f
.. (eqv? #f '())
;Value: #f
```
  * **5.3**
```
>  ;; 5.3, Should be: #f
.. (equal? #f '())
;Value: #f
```
  * **8.2**
```
>  ;; 8.2, Should be: (1 2 3 4 1 2 3 4 5)
.. (let ((ls (list 1 2 3 4)))
..   (append ls ls '(5)))
;Value: (1 2 3 4 1 2 3 4 5)
```

See [R5RS Pitfalls](http://sisc-scheme.org/r5rs_pitfall.php) ([source](http://sisc-scheme.org/r5rs_pitfall.scm)).